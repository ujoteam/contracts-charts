import React, { useRef, useState, useEffect } from 'react'
import { makeStyles, createStyles, useTheme } from '@material-ui/styles'
import Paper from '@material-ui/core/Paper'
import CircularProgress from '@material-ui/core/CircularProgress'
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'


function LoadingIndicator(props) {
    const classes = useStyles()
    const { isTxPending, pendingTxHash } = props

    return (
        <Paper className={classes.root}>
            <div className={classes.text}>
                <div>
                    {isTxPending && <strong>Transaction pending</strong>}
                    {!isTxPending && <strong>Transaction succeeded!</strong>}
                </div>
                {pendingTxHash &&
                    <div>View on Etherscan: <a href={`https://rinkeby.etherscan.io/tx/${pendingTxHash}`} target="_blank">{pendingTxHash.slice(0, 8)}...</a></div>
                }
            </div>
            {isTxPending &&
                <CircularProgress color="primary" size={20} className={classes.spinner} />
            }
            {!isTxPending &&
                <CheckCircleOutlineIcon style={{ fill: '#00d600' }} />
            }
        </Paper>
    )
}

const useStyles = makeStyles(theme => createStyles({
    root: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        position: 'absolute',
        textAlign: 'right',
        // color: 'white',
        fontSize: '0.8rem',
        width: 220,
        height: 38,
        padding: '4px 12px 4px 14px',
        right: 0,
        backgroundColor: 'white',
        '& a': {
            color: theme.palette.primary.main,
        },
    },
    text: {
        marginRight: 6,
    },
    spinner: {
        marginLeft: 10,
        verticalAlign: 'bottom',
    },
}))

export default LoadingIndicator

