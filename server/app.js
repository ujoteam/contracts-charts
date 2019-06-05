import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'
import Web3 from 'web3'
import redis from 'redis'
import BigNumber from 'bignumber.js'
import express from 'express'
import HDWalletProvider from 'truffle-hdwallet-provider'
import HTTPError from './util/HTTPError'

const chartContractJsonRoot = process.env.CONTRACT_JSON_ROOT || path.join(__dirname, 'static')
const chartContractJson = require(path.join(chartContractJsonRoot, 'Chart.json'))

let web3
let chartContract
let redisClient
let serverEthAccount

async function main() {
    //
    // Initialize web3
    //

    if (process.env.BACKEND_MNEMONIC) {
        web3 = new Web3(new HDWalletProvider(process.env.BACKEND_MNEMONIC, process.env.ETH_NODE_HOST))
    } else {
        // web3 = new Web3(process.env.ETH_NODE_HOST)
        // This is an idiotic workaround. See https://github.com/ethereum/web3.js/issues/2786
        const provider = new Web3.providers.HttpProvider(process.env.ETH_NODE_HOST)
        web3 = new Web3('http://')
        web3.setProvider(provider)
    }

    const ethAccounts = await web3.eth.getAccounts()
    console.log('eth accounts:', ethAccounts)
    serverEthAccount = ethAccounts[ethAccounts.length - 1]

    const currentNetwork = await web3.eth.net.getId()

    if (!chartContractJson.networks[currentNetwork] || !chartContractJson.networks[currentNetwork].address) {
        throw new Error(`Chart.json doesn't contain an entry for the current network ID (${currentNetwork}) ... are you sure you deployed the contract to this network?`)
    }

    chartContract = new web3.eth.Contract(chartContractJson.abi, chartContractJson.networks[currentNetwork].address)
    console.log('web3 initialized')


    //
    // Initialize redis
    //

    redisClient = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    })
    redisClient = Promise.promisifyAll(redisClient, { suffix: 'Async' })

    await redisClient.onAsync('ready')
    console.log('redis initialized')

    startWorker()
    startHTTPServer()
}

const DECIMALS = new BigNumber(10).pow(6)


async function startWorker() {

    async function getSong(cid, currentBlockNumber) {
        let { submittedInBlock, currentUpvotes, allTimeUpvotes, numUpvoters } = await chartContract.methods.songs(cid).call()
        submittedInBlock = new BigNumber(submittedInBlock.toString())
        currentUpvotes   = new BigNumber(currentUpvotes.toString()).div(DECIMALS)
        allTimeUpvotes   = new BigNumber(allTimeUpvotes.toString()).div(DECIMALS)
        numUpvoters      = new BigNumber(numUpvoters.toString())

        const { timestamp } = await web3.eth.getBlock(submittedInBlock)

        // Calculate the song's score for the currentBlockNumber
        currentBlockNumber = new BigNumber(currentBlockNumber.toString())
        const delta = currentBlockNumber.minus(submittedInBlock)
        const score = allTimeUpvotes.div( delta.times(0.2).plus(1) )

        return {
            cid,
            submittedInBlock: submittedInBlock.toString(),
            currentUpvotes: currentUpvotes.toString(),
            allTimeUpvotes: allTimeUpvotes.toString(),
            numUpvoters: numUpvoters.toString(),
            proposalTimestamp: timestamp,
            score,
        }
    }

    // const cursor = (await redisClient.getAsync('log-cursor:SongProposed')) || '0:0'
    // let [blockCursor, logCursor] = cursor.split(':')
    // blockCursor = parseInt(blockCursor, 10)
    // logCursor   = parseInt(logCursor, 10)

    async function loop() {
        const events = await chartContract.getPastEvents('SongProposed', { fromBlock: 0, toBlock: 'latest' })
        const cids = events.map(e => e.returnValues.cid)
        const currentBlockNumber = new BigNumber( (await web3.eth.getBlockNumber()).toString() )

        for (let cid of cids) {
            const song = await getSong(cid, currentBlockNumber)

            await redisClient.zaddAsync('songs:list:by-score', song.score.toString(), cid)
            await redisClient.zaddAsync('songs:list:by-proposal-timestamp', song.proposalTimestamp, cid)
            await redisClient.hsetAsync('songs:map', cid, JSON.stringify(song))
        }

        setTimeout(loop, 8000)
    }

    loop()
}

function startHTTPServer() {
    const app = express()
    const port = process.env.PORT || 3000

    app.use(express.static('static'))

    const asyncMW = fn => (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next) }

    //
    // Clear all cached data from Redis
    //
    app.get('/clear-redis', asyncMW(async (req, res) => {
        redisClient.del('songs:list:by-score')
        redisClient.del('songs:list:by-proposal-timestamp')
        redisClient.del('songs:map')
        res.json({})
    }))

    //
    // Fetch songs ordered by their leaderboard score
    //
    app.get('/leaderboard', asyncMW(async (req, res) => {
        let { offset = '0', limit = '10' } = req.query
        offset = parseInt(offset, 10)
        limit  = parseInt(limit, 10)

        const items = await redisClient.zrevrangeAsync('songs:list:by-score', offset, offset + limit - 1, 'WITHSCORES')
        const list = []
        for (let i = 0; i < items.length/2; i++) {
            const cid = items[i*2]
            const x = await redisClient.hgetAsync('songs:map', cid)
            const song = JSON.parse(x)
            list.push({ ...song, cid, score: items[i*2+1] })
        }

        res.json(list)
    }))

    //
    // Fetch songs ordered by their proposal date/time
    //
    app.get('/songs', asyncMW(async (req, res) => {
        let { reverse = '0', offset = '0', limit = '10' } = req.query
        offset = parseInt(offset, 10)
        limit  = parseInt(limit, 10)

        reverse = reverse === '0' ? false : true

        const cids = reverse
            ? await redisClient.zrangeAsync('songs:list:by-proposal-timestamp', offset, offset + limit - 1)
            : await redisClient.zrevrangeAsync('songs:list:by-proposal-timestamp', offset, offset + limit - 1)

        const list = await Promise.all(
            cids.map(cid => redisClient.hgetAsync('songs:map', cid).then(JSON.parse))
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

main()

