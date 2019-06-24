import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import Web3 from 'web3'
import App from './App'
import Theme from './Theme'
import store from './redux/store'
import * as serviceWorker from './serviceWorker'
import * as chart from './chart'
import { setChartClient, getAccounts, setEthereumNetworkID } from './redux/chartActions'
import chartContractJson from './Chart.json'

async function main() {
    // Init Ethereum stuff
    let web3
    if (window.ethereum) {
        web3 = new Web3(window.ethereum)
        // try {
        await window.ethereum.enable() // Request account access if needed
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

    const currentNetwork = await web3.eth.net.getId()
    store.dispatch(setEthereumNetworkID(currentNetwork))

    if (!chartContractJson.networks[currentNetwork] || !chartContractJson.networks[currentNetwork].address) {
        // throw new Error(`Chart.json doesn't contain an entry for the current network ID (${currentNetwork}) ... are you sure you deployed the contract to this network?`)
    } else {
        const chartClient = await chart.initClient({
            web3,
            chartContractAddress: chartContractJson.networks[currentNetwork].address,
        })

        // Make the chart client available to our Redux actions
        setChartClient(chartClient)

        // Fetch Ethereum accounts
        store.dispatch(getAccounts())
    }


    ReactDOM.render(
        <Provider store={store}>
            <Theme darkMode={false}>
                <App />
            </Theme>
        </Provider>
    , document.getElementById('root'))

    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    // Learn more about service workers: https://bit.ly/CRA-PWA
    serviceWorker.unregister()
}

window.addEventListener('load', () => {
    main()
})