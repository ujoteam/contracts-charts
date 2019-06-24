import fetch from 'node-fetch'
import cheerio from 'cheerio'

import * as redis from '../redis'
import HTTPError from './HTTPError'


export async function getYoutubeVideoMetadata(ytid) {
    let item = await redis.client.hgetAsync('youtube-videos', ytid)
    if (item) {
        return JSON.parse(item)
    }

    let resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${ytid}&part=snippet,contentDetails,statistics&key=${process.env.YOUTUBE_API_KEY}`)
    let data = await resp.json()
    if (data.items.length === 0) {
        throw new HTTPError(404, 'Video not found')
    }

    console.log('youtube vid ~>', data.items[0].snippet.thumbnails)

    item = {
        title: data.items[0].snippet.title,
        description: data.items[0].snippet.description,
        thumbnail: data.items[0].snippet.thumbnails.medium,
    }
    await redis.client.hsetAsync('youtube-videos', ytid, JSON.stringify(item))

    return item
}

export async function getDecryptArticleMetadata(id) {
    let item = await redis.client.hgetAsync('decrypt-articles', id)
    if (item) {
        return JSON.parse(item)
    }

    let resp = await fetch(`https://decrypt.co/${id}`)
    let data = await resp.text()

    let x = cheerio.load(data)

    let title = x('meta[property="og:title"]').attr('content')
    let description = x('meta[property="og:description"]').attr('content')
    let image = x('meta[property="og:image"]').attr('content')

    item = { title, description, image }
    await redis.client.hsetAsync('decrypt-articles', id, JSON.stringify(item))

    return item
}
