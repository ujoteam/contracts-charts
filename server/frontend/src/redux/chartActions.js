import BigNumber from 'bignumber.js'
import * as fetch from '../fetch'
import { timeout, enumerate } from '../utils'

export const SET_LEADERBOARD_DATA = 'SET_LEADERBOARD_DATA'
export const SET_ACCOUNTS = 'SET_ACCOUNTS'
export const SET_CURRENT_ACCOUNT = 'SET_CURRENT_ACCOUNT'
export const SET_TOKEN_BALANCE = 'SET_TOKEN_BALANCE'
export const SET_ETH_BALANCE = 'SET_ETH_BALANCE'
export const SET_YOUTUBE_VIDEO_DATA = 'SET_YOUTUBE_VIDEO_DATA'
export const SET_DECRYPT_ARTICLE_DATA = 'SET_DECRYPT_ARTICLE_DATA'
export const SET_IS_TX_PENDING = 'SET_IS_TX_PENDING'
export const SET_THEME = 'SET_THEME'
export const SET_ETHEREUM_NETWORK_ID = 'SET_ETHEREUM_NETWORK_ID'

let chartClient
export function setChartClient(client) {
    chartClient = client
}

export const setIsTxPending = (isTxPending, pendingTxHash = null) => {
    return async (dispatch) => {
        dispatch({
            type: SET_IS_TX_PENDING,
            payload: { isTxPending, pendingTxHash },
        })
    }
}

export const getAccounts = () => {
    return async (dispatch, getState) => {
        const accounts = await chartClient.getAccounts()
        dispatch({
            type: SET_ACCOUNTS,
            payload: { accounts },
        })

        if (accounts.length > 0 && getState().chart.currentAccount === null) {
            dispatch(setCurrentAccount(accounts[0]))
        }
    }
}

export const setCurrentAccount = (currentAccount) => {
    return async (dispatch) => {
        await Promise.all([
            dispatch(fetchEthBalance(currentAccount)),
            dispatch(fetchTokenBalance(currentAccount)),
            dispatch(getLeaderboardData(currentAccount)),
        ])

        dispatch({
            type: SET_CURRENT_ACCOUNT,
            payload: { currentAccount },
        })
    }
}

export const fetchEthBalance = (account) => {
    return async (dispatch) => {
        const balance = await chartClient.fetchEthBalance({ account })
        dispatch({
            type: SET_ETH_BALANCE,
            payload: { account, balance },
        })
    }
}

export const fetchTokenBalance = (account) => {
    return async (dispatch) => {
        const balance = await chartClient.fetchTokenBalance({ account })
        dispatch({
            type: SET_TOKEN_BALANCE,
            payload: { account, balance },
        })
    }
}

export const getLeaderboardData = (currentAccount) => {
    return async (dispatch) => {
        const leaderboardData = await fetch.getLeaderboardData()

        // fetch withdrawable token balances
        const withdrawableBalances = {}
        const withdrawableBalancesList = await Promise.all(
            leaderboardData.map(item => chartClient.getWithdrawableAmountRemaining({ cid: item.cid, account: currentAccount }))
        )
        for (let [i, balance] of enumerate(withdrawableBalancesList)) {
            withdrawableBalances[ leaderboardData[i].cid ] = new BigNumber( balance.toString() ).div( chartClient.DECIMALS )
        }

        // fetch upvote indices
        const upvoteIndices = {}
        const upvoteIndicesList = await Promise.all(
            leaderboardData.map(item => chartClient.getUpvoteIndex({ cid: item.cid, account: currentAccount }))
        )
        for (let [i, idx] of enumerate(upvoteIndicesList)) {
            upvoteIndices[ leaderboardData[i].cid ] = new BigNumber( idx.toString() )
        }

        dispatch({
            type: SET_LEADERBOARD_DATA,
            payload: {
                leaderboardData,
                withdrawableBalances,
                upvoteIndices,
            },
        })
    }
}

export const proposeCid = (cid, currentAccount) => {
    return async (dispatch) => {
        dispatch(setIsTxPending(true))

        const [ onTxHash, onReceipt ] = chartClient.proposeCid({ cid, account: currentAccount })
        const txHash = await onTxHash
        dispatch(setIsTxPending(true, txHash))
        await onReceipt
        await timeout(1200)
        await Promise.all([
            dispatch(fetchEthBalance(currentAccount)),
            dispatch(fetchTokenBalance(currentAccount)),
            dispatch(getLeaderboardData(currentAccount)),
        ])

        dispatch(setIsTxPending(false, txHash))
    }
}

export const upvoteCid = (cid, currentAccount) => {
    return async (dispatch) => {
        dispatch(setIsTxPending(true))

        const [ onTxHash, onReceipt ] = chartClient.upvoteCid({ cid, account: currentAccount })
        const txHash = await onTxHash
        dispatch(setIsTxPending(true, txHash))
        await onReceipt
        await timeout(1200)
        await Promise.all([
            dispatch(fetchEthBalance(currentAccount)),
            dispatch(fetchTokenBalance(currentAccount)),
            dispatch(getLeaderboardData(currentAccount)),
        ])

        dispatch(setIsTxPending(false, txHash))
    }
}

export const withdrawCid = (cid, currentAccount) => {
    return async (dispatch) => {
        dispatch(setIsTxPending(true))

        const [ onTxHash, onReceipt ] = chartClient.withdrawCid({ cid, account: currentAccount })
        const txHash = await onTxHash
        dispatch(setIsTxPending(true, txHash))
        await onReceipt
        await timeout(1200)
        await Promise.all([
            dispatch(fetchEthBalance(currentAccount)),
            dispatch(fetchTokenBalance(currentAccount)),
            dispatch(getLeaderboardData(currentAccount)),
        ])

        dispatch(setIsTxPending(false, txHash))
    }
}

export const getYoutubeVideoData = (ytid) => {
    return async (dispatch, getState) => {
        if (getState().chart.youtubeVideos[ytid]) {
            return
        }

        let data = await fetch.getYoutubeVideoData(ytid)

        dispatch({
            type: SET_YOUTUBE_VIDEO_DATA,
            payload: {
                ytid,
                data,
            },
        })
    }
}

export const getDecryptArticleData = (id) => {
    return async (dispatch, getState) => {
        if (getState().chart.decryptArticles[id]) {
            return
        }

        let data = await fetch.getDecryptArticleData(id)

        dispatch({
            type: SET_DECRYPT_ARTICLE_DATA,
            payload: {
                id,
                data,
            },
        })
    }
}

export const setTheme = (theme) => {
    return async (dispatch) => {
        dispatch({
            type: SET_THEME,
            payload: { theme },
        })
    }
}

export const setEthereumNetworkID = ({ ethereumNetworkID, metamaskError }) => {
    return async (dispatch) => {
        dispatch({
            type: SET_ETHEREUM_NETWORK_ID,
            payload: { ethereumNetworkID, metamaskError }
        })
    }
}

