const Web3 = require('web3')
const BigNumber = require('bignumber.js')
const chartContractJson = require('../../build/contracts/Chart.json')

const DECIMALS = new BigNumber(10).pow(6)

let web3
let chartContract
let ethAccounts

const accountSelect = document.getElementById('accounts')

async function init() {
    await initWeb3()
    accountSelect.innerHTML = ethAccounts.map(acct => `<option value="${acct}">${acct}</option>`).join('')

    await initEventListeners()
    await populateLeaderboard()
    await populateNumTokens()
}

async function populateNumTokens() {
    const numTokensElem = document.getElementById('num-tokens')
    const acct = accountSelect.value

    let numTokens = await chartContract.methods.balanceOf(acct).call()
    numTokens = new BigNumber(numTokens.toString())

    numTokensElem.innerHTML = numTokens.div( DECIMALS ).toString()
}

async function updateWithdrawableTokens() {
    const currentAccount = accountSelect.value

    const leaderboardData = await (await fetch('/leaderboard')).json()
    const withdrawable = {}
    const withdrawableList = await Promise.all(
        leaderboardData.map(item => chartContract.methods.getWithdrawableAmount(currentAccount, item.cid).call())
    )
    withdrawableList.forEach((amt, i) => {
        amt = new BigNumber( amt.toString() )
        withdrawable[ leaderboardData[i].cid ] = amt.div(DECIMALS).toString()
    })

    document.querySelectorAll('#leaderboard td.withdrawable')
        .forEach(elem => elem.innerHTML = withdrawable[elem.dataset.cid])
}

async function updateUpvoteIndices() {
    const currentAccount = accountSelect.value
    const leaderboardData = await (await fetch('/leaderboard')).json()
    const indices = {}
    for (let item of leaderboardData) {
        const idx = new BigNumber( (await chartContract.methods.getUpvoteIndex(item.cid, currentAccount).call()).toString() )
        indices[ item.cid ] = idx
    }

    document.querySelectorAll('#leaderboard td.upvote-index')
        .forEach(elem => elem.innerHTML = indices[elem.dataset.cid].toString() )
}

async function populateLeaderboard() {
    const leaderboardData = await (await fetch('/leaderboard')).json()
    const leaderboardElem = document.querySelector('#leaderboard tbody')

    leaderboardElem.innerHTML = leaderboardData.map((item, i) => `
        <tr>
            <td>${item.cid.slice(0, 16)}...</td>
            <td>${parseFloat(item.score).toFixed(4)}</td>
            <td>${item.allTimeUpvotes}</td>
            <td>${item.numUpvoters}</td>
            <td class="upvote-index" data-cid="${item.cid}">upvote index</td>
            <td>${item.submittedInBlock}</td>
            <td class="withdrawable" data-cid="${item.cid}"></td>
            <td><button class="upvote" data-cid="${item.cid}">Upvote</button></td>
        </tr>
    `).join('')

    const buttons = document.querySelectorAll('#leaderboard button.upvote')
    for (let button of buttons) {
        button.addEventListener('click', evt => {
            upvoteCid(evt.target.dataset.cid)
        })
    }
}

async function initWeb3() {
    const provider = new Web3.providers.HttpProvider(process.env.ETH_NODE_HOST)
    web3 = new Web3('http://')
    web3.setProvider(provider)

    ethAccounts = await web3.eth.getAccounts()

    const currentNetwork = await web3.eth.net.getId()

    if (!chartContractJson.networks[currentNetwork] || !chartContractJson.networks[currentNetwork].address) {
        throw new Error(`Chart.json doesn't contain an entry for the current network ID (${currentNetwork}) ... are you sure you deployed the contract to this network?`)
    }

    chartContract = new web3.eth.Contract(chartContractJson.abi, chartContractJson.networks[currentNetwork].address)
}

async function initEventListeners() {
    const inputNewCid = document.getElementById('new-cid')

    document.getElementById('btn-add-cid').addEventListener('click', async () => {
        await proposeCid(inputNewCid.value)
        inputNewCid.value = ''
    })

    document.getElementById('btn-generate-cid').addEventListener('click', () => {
        let result = ''
        const characters = 'abcdef0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < 64; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
        }
        inputNewCid.value = result
    })

    document.getElementById('btn-clear-redis').addEventListener('click', async () => {
        await fetch('/clear-redis')
        await populateLeaderboard()
        setTimeout(populateLeaderboard, 1200)
    })

    accountSelect.addEventListener('change', updateUI)
}

async function proposeCid(cid) {
    if (cid.indexOf('0x') === 0) {
        cid = cid.slice(2)
    }

    cid = Buffer.from(cid, 'hex')
    chartContract.methods.propose(cid).send({ from: accountSelect.value, gas: 200000 }, () => {})
    setTimeout(updateUI, 1500)
}

async function upvoteCid(cid) {
    if (cid.indexOf('0x') === 0) {
        cid = cid.slice(2)
    }

    cid = Buffer.from(cid, 'hex')
    chartContract.methods.upvote(cid).send({ from: accountSelect.value, gas: 200000 }, () => {})
    setTimeout(updateUI, 1500)
}

function updateUI() {
    populateNumTokens()
    updateWithdrawableTokens()
    updateUpvoteIndices()
}

init()
