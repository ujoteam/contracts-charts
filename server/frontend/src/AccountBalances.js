import React from 'react'
import { makeStyles, createStyles, useTheme } from '@material-ui/styles'

function AccountBalances(props) {
    const { tokenBalanceOf, ethBalanceOf, currentAccount } = props
    const classes = useStyles()
    const theme = useTheme()

    return (
        <div className={classes.accountBalances}>

            {theme.chart.ethereumLogo()}
            <div className={classes.ethBalance}>
                {(ethBalanceOf[currentAccount] || 0).toFixed(2)}
            </div>

            {theme.chart.coinsImage()}
            <div>
                {(tokenBalanceOf[currentAccount] || 0).toFixed(2)}
            </div>

        </div>
    )
}

const useStyles = makeStyles(theme => createStyles({
    accountBalances: {
        display: 'flex',
        alignItems: 'flex-end',
        width: 'fit-content',

        '& img': {
            marginRight: 12,
        },

        ...theme.chart.accountBalancesFontStyles,
    },
    ethBalance: {
        marginRight: 16,
    },
    coinsGif: {
        width: 56,
        verticalAlign: 'bottom',
    },
}))

export default AccountBalances
