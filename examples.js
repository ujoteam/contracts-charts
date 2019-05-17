


async function getSongScore(cid) {
    const chart = await Chart.deployed()
    const score = await chart.methods.getSongScore(cid).call()

    // the score will already be decay-weighted based on the formula in the smart contract
}

async function getSongsToday() {
    const chart = await Chart.deployed()
    const latestBlockNumber = await web3.eth.getBlockNumber()
    const blocksInADay = (24 * 60 * 60) / 15
    let events = await chart.contract.getPastEvents('SongProposed', {
        fromBlock: latestBlockNumber - blocksInADay,
        toBlock: 'latest',
    })

    // do ABI decoding
    events = Chart.decodeLogs(events)

    // ... do stuff with events ...
}

async function getSongsProposedByUser(userAddr) {
    const chart = await Chart.deployed()
    const latestBlockNumber = await web3.eth.getBlockNumber()
    const blocksInADay = (24 * 60 * 60) / 15
    let events = await chart.contract.getPastEvents('SongProposed', {
        filter: {
            proposer: userAddr,
        },
    })

    // do ABI decoding
    events = Chart.decodeLogs(events)

    // ... do stuff with events ...
}

async function getSongsUpvotedByUser(userAddr) {
    const chart = await Chart.deployed()
    const latestBlockNumber = await web3.eth.getBlockNumber()
    const blocksInADay = (24 * 60 * 60) / 15
    let events = await chart.contract.getPastEvents('SongUpvoted', {
        filter: {
            upvoter: userAddr,
        },
    })

    // do ABI decoding
    events = Chart.decodeLogs(events)

    // ... do stuff with events ...
}

