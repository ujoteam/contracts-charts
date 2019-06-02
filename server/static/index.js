const Web3 = require('web3')
const BigNumber = require('bignumber.js')
const chartContractJson = require('../../build/contracts/Chart.json')

const DECIMALS = new BigNumber(10).pow(6)

let web3
let chartContract
let ethAccounts

const accountSelect = document.getElementById('accounts')

async function init() {
    window.addEventListener('load', async () => {
        await initWeb3()
        accountSelect.innerHTML = ethAccounts.map(acct => `<option value="${acct}">${acct}</option>`).join('')

        await initEventListeners()
        await updateUI()
    })
}

async function initWeb3() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum)
        // try {
        await ethereum.enable() // Request account access if needed
        // } catch (error) {
        //     // User denied account access
        // }
    } else if (window.web3 !== undefined) {
        // use Metamask, et al. if available
        web3 = new Web3(window.web3.currentProvider)
    } else {
        // this is just for local testing
        web3 = new Web3('http://')
        web3.setProvider(new Web3.providers.HttpProvider(process.env.ETH_NODE_HOST))
    }


    ethAccounts = await web3.eth.getAccounts()

    const currentNetwork = await web3.eth.net.getId()

    if (!chartContractJson.networks[currentNetwork] || !chartContractJson.networks[currentNetwork].address) {
        throw new Error(`Chart.json doesn't contain an entry for the current network ID (${currentNetwork}) ... are you sure you deployed the contract to this network?`)
    }

    chartContract = new web3.eth.Contract(chartContractJson.abi, chartContractJson.networks[currentNetwork].address)
}

async function initEventListeners() {
    const inputNewCid = document.querySelector('#new-cid')

    document.querySelector('#btn-add-cid').addEventListener('click', async () => {
        await proposeCid(inputNewCid.value)
        inputNewCid.value = ''
    })

    document.querySelector('#btn-generate-cid').addEventListener('click', () => {
        let result = ''
        const characters = 'abcdef0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < 64; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
        }
        inputNewCid.value = result
    })

    document.querySelector('#btn-clear-redis').addEventListener('click', async () => {
        document.querySelector('#leaderboard tbody').innerHTML = ''
        await fetch('/clear-redis')
        setTimeout(updateUI, 1200)
    })

    accountSelect.addEventListener('change', updateUI)
}

function showTransactionPendingIndicator(show) {
    const elem = document.getElementById('transaction-pending')
    if (show) {
        elem.classList.add('show')
    } else {
        elem.classList.remove('show')
    }
}

async function proposeCid(cid) {
    if (cid.indexOf('0x') === 0) {
        cid = cid.slice(2)
    }

    cid = Buffer.from(cid, 'hex')

    showTransactionPendingIndicator(true)

    const tx = chartContract.methods.propose(cid).send({ from: accountSelect.value, gas: 200000 })
    tx.on('receipt', () => {
        console.log('receipt')
        setTimeout(() => {
            updateUI()
            showTransactionPendingIndicator(false)
        }, 1200)
    })
}

async function upvoteCid(cid) {
    if (cid.indexOf('0x') === 0) {
        cid = cid.slice(2)
    }

    cid = Buffer.from(cid, 'hex')

    showTransactionPendingIndicator(true)

    const tx = chartContract.methods.upvote(cid).send({ from: accountSelect.value, gas: 200000 }, () => {})
    tx.on('receipt', () => {
        console.log('receipt')
        setTimeout(() => {
            updateUI()
            showTransactionPendingIndicator(false)
        }, 1200)
    })
}

async function updateUI() {
    const currentAccount = accountSelect.value
    const leaderboardData = await (await fetch('/leaderboard')).json()

    async function populateNumTokens() {
        let numTokens = await chartContract.methods.balanceOf(currentAccount).call()
        numTokens = new BigNumber(numTokens.toString())
        document.querySelector('#num-tokens').innerHTML = numTokens.div( DECIMALS ).toString()
    }

    async function populateLeaderboard() {
        const leaderboardElem = document.querySelector('#leaderboard tbody')

        // fetch withdrawable token balances
        const withdrawableBalances = {}
        const withdrawableBalancesList = await Promise.all(
            leaderboardData.map(item => chartContract.methods.getWithdrawableAmount(currentAccount, item.cid).call())
        )
        for (let [i, balance] of enumerate(withdrawableBalancesList)) {
            withdrawableBalances[ leaderboardData[i].cid ] = new BigNumber( balance.toString() ).div(DECIMALS).toString()
        }

        // fetch upvote indices
        const upvoteIndices = {}
        for (let item of leaderboardData) {
            const idx = new BigNumber( (await chartContract.methods.getUpvoteIndex(item.cid, currentAccount).call()).toString() )
            upvoteIndices[ item.cid ] = idx
        }

        leaderboardElem.innerHTML = leaderboardData.map(item => `
            <tr>
                <td>${item.cid.slice(0, 16)}...</td>
                <td>${parseFloat(item.score).toFixed(4)}</td>
                <td>${item.allTimeUpvotes}</td>
                <td>${item.numUpvoters}</td>
                <td>${upvoteIndices[item.cid]}</td>
                <td>${item.submittedInBlock}</td>
                <td>${withdrawableBalances[item.cid]}</td>
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

    populateNumTokens()
    populateLeaderboard()
}

function* enumerate(list) {
    for (let i = 0; i < list.length; i++) {
        yield [i, list[i]]
    }
}

init()
