import path from 'path'
import Web3 from 'web3'
import HDWalletProvider from 'truffle-hdwallet-provider'


export let web3
export let chartContract
export let ethAccounts

const chartContractJsonRoot = process.env.CONTRACT_JSON_ROOT || path.join(__dirname, 'static')
const chartContractJson = require(path.join(chartContractJsonRoot, 'Chart.json'))

export async function initWeb3() {
    if (process.env.BACKEND_MNEMONIC) {
        web3 = new Web3(new HDWalletProvider(process.env.BACKEND_MNEMONIC, process.env.ETH_NODE_HOST))
    } else {
        // web3 = new Web3(process.env.ETH_NODE_HOST)
        // This is an idiotic workaround. See https://github.com/ethereum/web3.js/issues/2786
        const provider = new Web3.providers.HttpProvider(process.env.ETH_NODE_HOST)
        web3 = new Web3('http://')
        web3.setProvider(provider)
    }

    ethAccounts = await web3.eth.getAccounts()
    console.log('eth accounts:', ethAccounts)

    const currentNetwork = await web3.eth.net.getId()

    if (!chartContractJson.networks[currentNetwork] || !chartContractJson.networks[currentNetwork].address) {
        throw new Error(`Chart.json doesn't contain an entry for the current network ID (${currentNetwork}) ... are you sure you deployed the contract to this network?`)
    }

    chartContract = new web3.eth.Contract(chartContractJson.abi, chartContractJson.networks[currentNetwork].address)
}