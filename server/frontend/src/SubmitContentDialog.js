import React, { useState, useEffect } from 'react'
import { makeStyles, createStyles, useTheme } from '@material-ui/styles'
import Typography from '@material-ui/core/Typography'
import FormHelperText from '@material-ui/core/FormHelperText'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import DialogActions from '@material-ui/core/DialogActions'
import TextField from '@material-ui/core/TextField'
import CircularProgress from '@material-ui/core/CircularProgress'
import Fab from '@material-ui/core/Fab'
import Button from '@material-ui/core/Button'
import SendIcon from '@material-ui/icons/Send'


function SubmitContentDialog(props) {
    const classes = useStyles()
    const theme = useTheme()
    const [ inputCid, setInputCid ] = useState('')
    const [ insufficientFundsError, setInsufficientFundsError ] = useState(null)
    const [ formError, setFormError ] = useState(null)

    const { ethBalanceOf, tokenBalanceOf, currentAccount } = props

    async function onClickProposeCid() {
        props.setIsLoading(true)
        const cid = await theme.chart.mapContentLinkToCid(inputCid)
        await props.proposeCid(cid, currentAccount)
        setInputCid('')
        props.setIsLoading(false)
    }

    function onChangeInput(evt) {
        let inputText = evt.target.value

        setInputCid(inputText)

        if (inputText.length === 0) {
            setFormError(null)
            return
        }

        if (inputText.indexOf('http') !== 0) {
            inputText = 'https://' + inputText
        }

        const valid = theme.chart.validateNewContentLink(inputText)
        if (!valid) {
            setFormError(`That doesn't look like a valid link`)
        } else {
            setFormError(null)
        }
    }

    useEffect(() => {
        if (ethBalanceOf[currentAccount] && ethBalanceOf[currentAccount].eq(0)) {
            setInsufficientFundsError(`You don't have enough Ether to submit anything.`)
        } else if (tokenBalanceOf[currentAccount] && tokenBalanceOf[currentAccount].eq(0)) {
            setInsufficientFundsError(`You don't have enough tokens to submit anything.`)
        } else {
            setInsufficientFundsError(null)
        }
    }, [currentAccount, ethBalanceOf, tokenBalanceOf])

    return (
        <Dialog open={props.open} onClose={props.onClose}>
            <DialogTitle>{theme.chart.textSubmitContentCTA}</DialogTitle>
            <DialogContent>
                <Typography component="div">
                    <div className={classes.main}>
                        Submitting costs {theme.chart.coinsImage({ style: { width: 'unset', height: 26, verticalAlign: 'bottom' } })} <strong>1 token.</strong>  When other users upvote your submission, you earn tokens in return.

                        {insufficientFundsError &&
                            <div className={classes.insufficientFundsError}>{insufficientFundsError}</div>
                        }

                        {!insufficientFundsError &&
                            <div style={{ display: 'flex' }}>
                                <div style={{ flexGrow: 1 }}>
                                    <TextField
                                        label={theme.chart.textSubmitContentInputFieldLabel}
                                        value={inputCid}
                                        fullWidth
                                        onChange={onChangeInput}
                                        className={classes.textField}
                                    />
                                    {formError &&
                                        <FormHelperText error={true}>{formError}</FormHelperText>
                                    }
                                </div>

                                <Fab onClick={onClickProposeCid} size="small" color="primary" style={{ alignSelf: 'flex-end' }} disabled={inputCid.length === 0 || !!formError}>
                                    <SendIcon />
                                </Fab>
                            </div>
                        }

                        {props.isLoading &&
                            <div className={classes.loadingIndicatorWrapper}>
                                Transaction pending... (it's safe to close this window now)
                                <CircularProgress color="primary" size={20} className={classes.loadingIndicator} />
                            </div>
                        }
                    </div>
                </Typography>

                <DialogActions>
                    <Button color="primary" onClick={props.onClose}>Close</Button>
                </DialogActions>

            </DialogContent>
        </Dialog>
    )
}

const useStyles = makeStyles(theme => createStyles({
    main: {
        margin: '0 0 20px 0',

        '& button': {
            margin: '0 10px',
        },
    },
    insufficientFundsError: {
        marginTop: 20,
        color: 'red',
    },
    textField: {
        marginTop: 20,
    },
    loadingIndicatorWrapper: {
        fontWeight: 'bold',
        marginTop: 30,
    },
    loadingIndicator: {
        marginLeft: 10,
        verticalAlign: 'bottom',
    },
}))

export default SubmitContentDialog

