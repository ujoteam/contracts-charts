

export async function clearRedis() {
    await fetch('/clear-redis')
}

export async function requestFaucet(address) {
    await fetch('/faucet?address=' + address)
}

export async function getLeaderboardData() {
    return (await fetch('/leaderboard')).json()
}

export async function getYoutubeVideoData(ytid) {
    return (await fetch(`/youtube-video/${ytid}`)).json()
}

export async function getDecryptArticleData(id) {
    return (await fetch(`/decrypt-article/${id}`)).json()
}
