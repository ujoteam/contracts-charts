import BigNumber from 'bignumber.js'
import Promise from 'bluebird'
import sortBy from 'lodash/sortBy'
import { IncomingWebhook } from '@slack/webhook'
import * as redis from './redis'
import { parseCid } from './utils'
import { web3, chartContract } from './web3'
import { getYoutubeVideoMetadata } from './util/data-sources'

// @@TODO: fetch from contract
const DECIMALS = new BigNumber(10).pow(6)

async function getSongFromBlockchain(cid, currentBlockNumber) {
    let { submittedInBlock, currentUpvotes, allTimeUpvotes, numUpvoters } = await chartContract.methods.songs(cid).call({}, currentBlockNumber)
    submittedInBlock = new BigNumber(submittedInBlock.toString())
    currentUpvotes   = new BigNumber(currentUpvotes.toString()).div(DECIMALS)
    allTimeUpvotes   = new BigNumber(allTimeUpvotes.toString()).div(DECIMALS)
    numUpvoters      = new BigNumber(numUpvoters.toString())

    const { timestamp } = await web3.eth.getBlock(submittedInBlock)

    // Calculate the song's score for the currentBlockNumber
    // currentBlockNumber = new BigNumber(currentBlockNumber.toString())
    // const delta = currentBlockNumber.minus(submittedInBlock)
    // const score = allTimeUpvotes.div( delta.times(0.2).plus(1) )

    return {
        cid,
        submittedInBlock: submittedInBlock.toString(),
        currentUpvotes: currentUpvotes.toString(),
        allTimeUpvotes: allTimeUpvotes.toString(),
        numUpvoters: numUpvoters.toString(),
        proposalTimestamp: timestamp,
        // score: calculateSongScore({ submittedInBlock, allTimeUpvotes }, currentBlockNumber),
    }
}

function calculateSongScore({ submittedInBlock, allTimeUpvotes }, currentBlockNumber) {
    // Calculate the song's score for the currentBlockNumber
    currentBlockNumber = new BigNumber(currentBlockNumber.toString())
    const delta = currentBlockNumber.minus(submittedInBlock)
    const score = new BigNumber( allTimeUpvotes.toString() ).times(1000).plus(1).div( delta.times(0.0002).plus(1) )
    return score.toString()

    //     upvotes
    // -----------------
    // 0.2 * #blocks + 1
}

// const cursor = (await redis.client.getAsync('log-cursor:SongProposed')) || '0:0'
// let [blockCursor, logCursor] = cursor.split(':')
// blockCursor = parseInt(blockCursor, 10)
// logCursor   = parseInt(logCursor, 10)
export async function pollContractForEvents() {
    const fromBlockStr = await redis.client.getAsync('songs:block-cursor')
    const fromBlock = fromBlockStr ? parseInt(fromBlockStr, 10) + 1 : 0
    const toBlock = (await web3.eth.getBlock('latest')).number

    const events = await chartContract.getPastEvents({ fromBlock, toBlock })

    for (let event of events) {
        if (event.event === 'SongProposed') {
            const { cid } = event.returnValues
            console.log('[pollContractForEvents] SongProposed:', cid)

            const song = await getSongFromBlockchain(cid, event.blockNumber)

            await redis.client.saddAsync('songs:cids', cid)
            await redis.client.zaddAsync('songs:list:by-proposal-timestamp', song.proposalTimestamp, cid)
            await redis.client.hsetAsync('songs:map', cid, JSON.stringify(song))

            const { blockNumber, returnValues: { proposer } } = event
            const [ type, serviceSpecificID ] = parseCid(cid)
            if (type !== 'unknown') {
                await redis.client.zincrbyAsync('songs:trending:' + type, 1, cid)
            }

        } else if (event.event === 'SongUpvoted') {
            const { blockNumber, returnValues: { cid, upvoter } } = event
            console.log('[pollContractForEvents] SongUpvoted:', cid, upvoter)

            const song = await getSongFromBlockchain(cid, event.blockNumber)
            await redis.client.hsetAsync('songs:map', cid, JSON.stringify(song))

            const [ type, serviceSpecificID ] = parseCid(cid)
            if (type !== 'unknown') {
                await redis.client.zincrbyAsync('songs:trending:' + type, 1, cid)
            }
        }

        console.log('[pollContractForEvents] setting cursor to', event.blockNumber)
        await redis.client.setAsync('songs:block-cursor', event.blockNumber)
    }
}

export async function updateSongScore() {
    const currentBlockNumber = new BigNumber( (await web3.eth.getBlockNumber()).toString() )

    // @@TODO: use SSCAN, not SMEMBERS
    const cids = await redis.client.smembersAsync('songs:cids')

    for (let cid of cids) {
        const song = await getSongFromBlockchain(cid, currentBlockNumber)
        const score = calculateSongScore(song, currentBlockNumber)

        await redis.client.zaddAsync('songs:list:by-score', score, cid)
    }

    setTimeout(updateSongScore, 5000)
}

export async function reportTrendingSongs() {
    console.log('[trending] running trending song report...')

    const topItems = (await redis.client.zrevrangeAsync('songs:trending:yt', 0, 0)) || [] // @@TODO: don't hardcode 'yt' type
    if (topItems.length === 0) {
        console.log('[trending] no items :(')
        return
    }

    try {
        await redis.client.delAsync('songs:trending:yt')

        const currentBlockNumber = (await web3.eth.getBlock('latest')).number
        let videos = await Promise.all(
            topItems.map(cid => [ cid, parseCid(cid)[1] ])
                .map(async ([cid, ytid]) => {
                    let chartStats = JSON.parse(await redis.client.hgetAsync('songs:map', cid))
                    let youtubeMeta = await getYoutubeVideoMetadata( ytid )
                    let score = parseFloat(calculateSongScore(chartStats, currentBlockNumber)) * 1000
                    return { ...youtubeMeta, chartStats, ytid, cid, score }
                })
        )
        videos = sortBy(videos, 'score').reverse()

        // const pretext = [
        //     ':domo_dance::domo_dance::domo_dance: In first place... :domo_dance::domo_dance::domo_dance:',
        //     'Good stuff, right?\n\n:marioluigidance::marioluigidance::marioluigidance: In second place... :marioluigidance::marioluigidance::marioluigidance:',
        //     'Get over there and upvote!\n\n:partydoge2::partydoge2::partydoge2: In third place... :partydoge2::partydoge2::partydoge2:',
        // ]

        for (let v of videos) {
            console.log(v)
        }

        const slackWebhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)

        let resp = await slackWebhook.send({
            text: `:domo_dance::domo_dance::domo_dance: :fire: Check out what's trending on Ujo Charts today! :fire: :domo_dance::domo_dance::domo_dance:`,
            attachments: videos.map((video, i) => ({
                // pretext: pretext[i],
                fallback: video.title,
                title: video.title,
                title_link: 'http://dev-charts-env.eefn3nsdpx.us-east-1.elasticbeanstalk.com',
                // text: video.title, //'https://youtube.com/watch?v=' + video.ytid,
                image_url: (video.thumbnail || {}).url,
                fields: [
                    {
                        title: 'Score',
                        value: video.score.toFixed(2),
                        short: true,
                    },
                    {
                        title: 'Upvotes',
                        value: video.chartStats.allTimeUpvotes,
                        short: true,
                    },
                    {
                        title: 'Submitted',
                        value: new Date(parseInt(video.chartStats.proposalTimestamp, 10) * 1000).toDateString(),
                        short: true,
                    },
                ],
            })),
        })

        resp = await slackWebhook.send({
            text: [
                // `:point_down::point_down::point_down::point_down::point_down::point_down::point_down::point_down::point_down::point_down:`,
                `:point_right: Don't forget: at Ujo, we build curation mechanisms for _all_ types of content, not just music.`,
                `:point_right: *Come say hi in <#C86C12LP7|ujo-public>* if your team is interested in building something together! `,
                `:ujo2: Visit our charts: http://dev-charts-env.eefn3nsdpx.us-east-1.elasticbeanstalk.com :ujo2:`
            ].join('\n')
        })

    } catch (err) {
        console.error('[reportTrendingSongs] error:', err)
    }
}
