import Promise from 'bluebird'
import redis from 'redis'

export let client

export async function init() {
    client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    })
    client = Promise.promisifyAll(client, { suffix: 'Async' })

    await client.onAsync('ready')
    return client
}


export async function clearAll() {
    await Promise.all([
        client.delAsync('songs:list:by-score'),
        client.delAsync('songs:list:by-proposal-timestamp'),
        client.delAsync('songs:map'),
        client.delAsync('songs:block-cursor'),
        client.delAsync('songs:cids'),
        client.delAsync('songs:trending:yt'),
        client.delAsync('songs:trending:decrypt'),
        client.delAsync('youtube-videos'),
        client.delAsync('decrypt-articles'),
    ])
}
