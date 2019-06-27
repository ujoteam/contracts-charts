import { SET_ACCOUNTS, SET_CURRENT_ACCOUNT, SET_ETH_BALANCE, SET_TOKEN_BALANCE, SET_LEADERBOARD_DATA, SET_YOUTUBE_VIDEO_DATA, SET_DECRYPT_ARTICLE_DATA, SET_IS_TX_PENDING, SET_THEME, SET_ETHEREUM_NETWORK_ID } from './chartActions'

const initialState = {
    isTxPending: false,
    pendingTxHash: null,
    // isTxPending: true,
    // pendingTxHash: '0x53e1b541e7d1b02b579008ebc6a2ef7d292e80d1956162544ce58ffcb084aa7a',

    accounts: [],
    currentAccount: null,
    tokenBalanceOf: {},
    ethBalanceOf: {},
    leaderboardData: [],
    withdrawableBalances: {},
    upvoteIndices: {},

    youtubeVideos: {},
    decryptArticles: {},

    theme: 'ujo',
    ethereumNetworkID: null,
    metamaskError: null,
}

export default (state = initialState, action) => {
    switch (action.type) {
    case SET_IS_TX_PENDING: {
        return {
            ...state,
            isTxPending: action.payload.isTxPending,
            pendingTxHash: action.payload.pendingTxHash,
        }
    }

    case SET_ACCOUNTS: {
        const { accounts } = action.payload
        return {
            ...state,
            accounts,
        }
    }

    case SET_CURRENT_ACCOUNT: {
        const { currentAccount } = action.payload
        return {
            ...state,
            currentAccount,
        }
    }

    case SET_ETH_BALANCE: {
        const { account, balance } = action.payload
        return {
            ...state,
            ethBalanceOf: {
                ...state.tokenBalanceOf,
                [account]: balance,
            },
        }
    }

    case SET_TOKEN_BALANCE: {
        const { account, balance } = action.payload
        return {
            ...state,
            tokenBalanceOf: {
                ...state.tokenBalanceOf,
                [account]: balance,
            },
        }
    }

    case SET_LEADERBOARD_DATA: {
        const { leaderboardData, withdrawableBalances, upvoteIndices } = action.payload
        return {
            ...state,
            leaderboardData,
            withdrawableBalances,
            upvoteIndices,
        }
    }

    case SET_YOUTUBE_VIDEO_DATA: {
        const { ytid, data } = action.payload
        return {
            ...state,
            youtubeVideos: {
                ...state.youtubeVideos,
                [ytid]: data,
            },
        }
    }

    case SET_DECRYPT_ARTICLE_DATA: {
        const { id, data } = action.payload
        return {
            ...state,
            decryptArticles: {
                ...state.decryptArticles,
                [id]: data,
            },
        }
    }

    case SET_THEME: {
        return {
            ...state,
            theme: action.payload.theme,
        }
    }

    case SET_ETHEREUM_NETWORK_ID: {
        return {
            ...state,
            ethereumNetworkID: action.payload.ethereumNetworkID,
            metamaskError: action.payload.metamaskError,
        }
    }

    default:
        return {
            ...state,
        }
    }
}