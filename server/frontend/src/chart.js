import BigNumber from 'bignumber.js'
import { receipt, ValidationError, toBN, hexToBuffer } from './utils'

import chartContractJson from './Chart.json'


export async function initClient({ web3, chartContractAddress }) {
    const contract = new web3.eth.Contract(chartContractJson.abi, chartContractAddress)

    const client = {
        web3,
        contract,
        DECIMALS: chartContractAddress ? toBN(10).pow(toBN( await contract.methods.DECIMALS().call() )) : undefined,

        PayoutCurve: {
            Linear: 0,
            Reciprocal: 1,
            fromString(x) {
                switch (x.toLowerCase()) {
                case 'linear':     return client.PayoutCurve.Linear
                case 'reciprocal': return client.PayoutCurve.Reciprocal
                default: throw new ValidationError('payoutCurve must be "linear" or "reciprocal"')
                }
            },
            toString(x) {
                x = toBN(x).toNumber()
                switch (x) {
                case client.PayoutCurve.Linear:     return 'linear'
                case client.PayoutCurve.Reciprocal: return 'reciprocal'
                default: throw new ValidationError('payoutCurve must be 0 or 1')
                }
            },
        },

        async deploy({ payoutCurve, proposalCost }, { from, gas, gasPrice }) {
            if (typeof payoutCurve === 'string') {
                payoutCurve = client.PayoutCurve.fromString(payoutCurve)
            }

            const newInstance =
                await contract.deploy({
                    data:      chartContractJson.bytecode,
                    arguments: [payoutCurve, proposalCost],
                }).send({
                    from, gas, gasPrice
                })

            client.contract = newInstance
            client.DECIMALS = toBN(10).pow(toBN( await contract.methods.DECIMALS().call() ))
        },

        async getAccounts() {
            return web3.eth.getAccounts()
        },

        async getWithdrawableAmountRemaining({ cid, account }) {
            return toBN( await client.contract.methods.getWithdrawableAmountRemaining(account, cid).call() )
        },

        async getUpvoteIndex({ cid, account }) {
            return toBN( await client.contract.methods.getUpvoteIndex(cid, account).call() )
        },

        async fetchEthBalance({ account }) {
            const weiBal = await web3.eth.getBalance(account)
            return toBN( web3.utils.fromWei(weiBal, 'ether') )
        },

        async fetchTokenBalance({ account }) {
            let receivedTokenGrant = await client.contract.methods.receivedTokenGrant(account).call()
            if (!receivedTokenGrant) {
                return toBN(100)
            }

            let bal = await client.contract.methods.balanceOf(account).call()
            return toBN( await client.contract.methods.balanceOf(account).call() ).div( client.DECIMALS )
        },

        async proposeCid({ cid, account }) {
            cid = hexToBuffer(cid)
            const tx = client.contract.methods.propose(cid).send({ from: account, gas: 200000 })
            return receipt(tx)
        },

        async upvoteCid({ cid, account }) {
            cid = hexToBuffer(cid)
            const tx = client.contract.methods.upvote(cid).send({ from: account, gas: 200000 })
            return receipt(tx)
        },

        async withdrawCid({ cid, account }) {
            cid = hexToBuffer(cid)
            const tx = client.contract.methods.withdraw([cid]).send({ from: account, gas: 200000 })
            return receipt(tx)
        },
    }

    return client
}
