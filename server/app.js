import Promise from 'bluebird'
import BigNumber from 'bignumber.js'
import { IncomingWebhook } from '@slack/webhook'

import * as redis from './redis'
import * as api from './api'
import { initWeb3 }  from './web3'
import { pollContractForEvents, updateSongScore, reportTrendingSongs } from './workers'

const TRENDING_REPORT_INTERVAL_SECONDS = parseInt(process.env.TRENDING_REPORT_INTERVAL_SECONDS, 10)


async function main() {
    // Initialize web3
    await initWeb3()
    console.log('web3 initialized')

    // Initialize redis
    await redis.init()
    console.log('redis initialized')

    // Initialize the background workers
    startIntervalJob(pollContractForEvents, 'songs:worker:poll-contract:last-run', 3000)
    startIntervalJob(updateSongScore,       'songs:worker:update-song-score:last-run', 5000)
    startIntervalJob(reportTrendingSongs,   'songs:worker:report-trending:last-run', TRENDING_REPORT_INTERVAL_SECONDS, 10000)
    console.log('workers initialized')

    // Initialize the HTTP API
    api.startHTTPServer()
    console.log('api server initialized')
}

function startIntervalJob(fn, redisKey, jobIntervalSeconds, pollIntervalSeconds) {
    pollIntervalSeconds = pollIntervalSeconds || jobIntervalSeconds

    async function runJob() {
        let lastRun = 0
        const lastRunStr = await redis.client.getAsync(redisKey)
        if (lastRunStr) {
            lastRun = parseInt(lastRunStr, 10)
        }

        const now = new Date().getTime() / 1000
        if (lastRun !== 0 && now < lastRun + jobIntervalSeconds) {
            setTimeout(runJob, pollIntervalSeconds * 1000)
            return
        }

        try {
            await fn()
        } catch (err) {
            console.error(`[worker ${redisKey}] error:`, err)
        }
        await redis.client.setAsync(redisKey, Math.floor(new Date().getTime() / 1000))

        setTimeout(runJob, pollIntervalSeconds * 1000)
    }
    runJob()
}


main()

