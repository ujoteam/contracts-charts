import express from 'express'
import Promise from 'bluebird'
import { getYoutubeVideoMetadata, getDecryptArticleMetadata } from './util/data-sources'
import { reportTrendingSongs } from './workers'
import * as redis from './redis'

export function startHTTPServer() {
    const app = express()
    const port = process.env.PORT || 3000

    app.use(express.static('static'))

    const asyncMW = fn => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next) }

    //
    // Clear all cached data from Redis
    //
    app.get('/clear-redis', asyncMW(async (req, res) => {
        await redis.clearAll()
        res.json({})
    }))

    //
    // Fetch songs ordered by their leaderboard score
    //
    app.get('/leaderboard', asyncMW(async (req, res) => {
        let { offset = '0', limit = '1000' } = req.query
        offset = parseInt(offset, 10)
        limit  = parseInt(limit, 10)

        const items = await redis.client.zrevrangeAsync('songs:list:by-score', offset, offset + limit - 1, 'WITHSCORES')
        const list = []
        for (let i = 0; i < items.length/2; i++) {
            const cid = items[i*2]
            const x = await redis.client.hgetAsync('songs:map', cid)
            const song = JSON.parse(x)
            list.push({ ...song, cid, score: items[i*2+1] })
        }

        res.json(list)
    }))

    //
    // Fetch songs ordered by their proposal date/time
    //
    app.get('/songs', asyncMW(async (req, res) => {
        let { reverse = '0', offset = '0', limit = '1000' } = req.query
        offset = parseInt(offset, 10)
        limit  = parseInt(limit, 10)

        reverse = reverse === '0' ? false : true

        const cids = reverse
            ? await redis.client.zrangeAsync('songs:list:by-proposal-timestamp', offset, offset + limit - 1)
            : await redis.client.zrevrangeAsync('songs:list:by-proposal-timestamp', offset, offset + limit - 1)

        const list = await Promise.all(
            cids.map(async (cid) => {
                const [scoreStr, song] = await Promise.all([
                    redis.client.zscoreAsync('songs:list:by-score', cid),
                    redis.client.hgetAsync('songs:map', cid).then(JSON.parse)
                ])
                const score = scoreStr ? parseFloat(scoreStr) : 0
                return { ...song, score }
            })
        )

        res.json(list)
    }))

    //
    // Replenish the requesting user's ETH
    //
    app.get('/faucet', asyncMW(async (req, res, next) => {
        let { address, amount = '0.2' } = req.query
        if (!address) {
            throw new HTTPError(400, 'Missing field: address')
        }

        amount = parseFloat(amount)

        const maxFaucetSendAmount = process.env.MAX_FAUCET_SEND_AMOUNT || 0.2

        // If the user already has enough ETH, don't do anything.
        const balance = web3.utils.toBN( await web3.eth.getBalance(address) )
        const maxAmount = web3.utils.toBN( web3.utils.toWei(`${maxFaucetSendAmount}`, 'ether') )
        if (balance.gte( maxAmount )) {
            return res.status(200).json({ result: 'you have plenty of ETH already' })
        }

        const wei = web3.utils.toWei(Math.min(amount, maxFaucetSendAmount).toString(), 'ether')
        const tx = await web3.eth.sendTransaction({ from: serverEthAccount, to: address, value: wei })

        return res.status(200).json({ result: 'sent you some ETH' })
    }))

    app.get('/youtube-video/:ytid', asyncMW(async (req, res) => {
        const { ytid } = req.params

        const item = await getYoutubeVideoMetadata(ytid)

        return res.json(item)
    }))

    app.get('/decrypt-article/:id', asyncMW(async (req, res) => {
        const { id } = req.params

        const item = await getDecryptArticleMetadata(id)

        return res.json(item)
    }))

    app.get('/run-trending-report', asyncMW(async (req, res) => {
        await reportTrendingSongs()
        return res.json({})
    }))

    //
    // Error handler
    //
    app.use((err, req, res, next) => {
        console.error(err)

        if (err.statusCode) { // instance of HTTPError
            res.status(err.statusCode).json({ error: err.message })
        } else { // something else
            res.status(500).json({ error: `Unhandled error: ${err.toString()}` })
        }
    })

    app.listen(port, () => console.log(`http server initialized (port ${port})`))
}

