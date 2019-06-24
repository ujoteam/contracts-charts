import React, { useRef, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import sortBy from 'lodash/sortBy'
import moment from 'moment'
import { makeStyles, createStyles, useTheme } from '@material-ui/styles'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import Typography from '@material-ui/core/Typography'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import DialogActions from '@material-ui/core/DialogActions'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CircularProgress from '@material-ui/core/CircularProgress'
import FormControl from '@material-ui/core/FormControl'
import FormHelperText from '@material-ui/core/FormHelperText'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import IconButton from '@material-ui/core/IconButton'
import Fab from '@material-ui/core/Fab'
import Tooltip from '@material-ui/core/Tooltip'
import ThumbUpIcon from '@material-ui/icons/ThumbUp'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'
import AddIcon from '@material-ui/icons/Add'
import Theme from './Theme'
import { H2, H3, H4, H5, H6 } from './Typography'
import { getLeaderboardData, setCurrentAccount, fetchTokenBalance, proposeCid, upvoteCid, withdrawCid, setIsLoading, setTheme } from './redux/chartActions'
import { timeout } from './utils'
import * as fetch from './fetch'
import LeaderboardTable from './LeaderboardTable'
import VideoLeaderboardTable from './VideoLeaderboardTable'
import AccountBalances from './AccountBalances'
import SubmitContentDialog from './SubmitContentDialog'

import './fonts/fonts.css'
import 'typeface-roboto'
import metamaskLogo from './images/metamask.png'

function App(props) {
    const { currentAccount, accounts, setCurrentAccount, getLeaderboardData, fetchTokenBalance, proposeCid, upvoteCid, withdrawCid, setIsLoading, isLoading } = props
    const _inputCid = useRef(null)

    const [ submitContentDialogOpen, setSubmitContentDialogOpen ] = useState(false)
    const classes = useStyles()
    const theme = useTheme()

    function onClickGenerateCid() {
        let result = ''
        const characters = 'abcdef0123456789'
        const charactersLength = characters.length
        for (let i = 0; i < 64; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength))
        }
        _inputCid.current.value = result
        _inputCid.current.focus()
    }


    async function clearRedis() {
        setIsLoading(true)

        await fetch.clearRedis()
        await timeout(1200)

        await getLeaderboardData(currentAccount)

        setIsLoading(false)
    }

    return (
        <main className={classes.main}>
            <div className={classes.backdrop} />

            <div className={classes.mainInner}>
                <header className={classes.header}>
                    <div className={classes.headerLeft}>
                        {theme.chart.logoComponent()}
                        <div className={classes.headerLeftTitle}>Charts</div>
                    </div>

                    <div className={classes.headerRight}>
                        <AccountBalances
                            currentAccount={currentAccount}
                            tokenBalanceOf={props.tokenBalanceOf}
                            ethBalanceOf={props.ethBalanceOf}
                        />
                    </div>
                </header>

                <Card>
                    <CardContent className={classes.leaderboardCard}>
                        <div className={classes.leaderboardCardHeader}>
                            <H2>{theme.chart.cardTitleText}</H2>

                            {/*!isLoading && accounts.length > 1 &&
                                <div className={classes.accountPickerWrapper}>
                                    {accounts.length > 0 && currentAccount &&
                                        <FormControl className={classes.formControl} margin="none">
                                            <Select value={currentAccount} onChange={evt => setCurrentAccount(evt.target.value)} classes={{ selectMenu: classes.accountPickerInput }}>
                                                {accounts.map(acct => (
                                                    <MenuItem key={acct} value={acct}>{acct}</MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText style={{ textAlign: 'right' }}>Current account</FormHelperText>
                                        </FormControl>
                                    }
                                </div>
                            */}
                            {isLoading &&
                                <div className={classes.loadingIndicatorWrapper}>
                                    Transaction pending...
                                    <CircularProgress color="primary" size={20} className={classes.loadingIndicator} />
                                </div>
                            }

                            {!isLoading &&
                                <Fab
                                    variant="extended"
                                    size="small"
                                    color="primary"
                                    aria-label="Add"
                                    className={classes.btnOpenSubmitDialog}
                                    onClick={() => setSubmitContentDialogOpen(true)}
                                >
                                    <AddIcon /> {theme.chart.textSubmitContentCTA}
                                </Fab>
                            }
                        </div>

                        {theme.chart.leaderboardComponent()}

                    </CardContent>
                </Card>

                <div className={classes.bottomToolbar}>
                    <Button
                        onClick={() => props.setTheme('ujo')}
                        size="small"
                        style={props.theme === 'ujo' ? {color: 'white'} : {color: '#a2a2a2'}}
                        variant={props.theme === 'ujo' ? 'contained' : undefined}
                        color={props.theme === 'ujo' ? 'primary' : undefined}
                    >
                        Ujo
                    </Button>

                    <Button
                        onClick={() => props.setTheme('decrypt')}
                        size="small"
                        style={props.theme === 'decrypt' ? {color: 'white'} : {color: '#a2a2a2'}}
                        variant={props.theme === 'decrypt' ? 'contained' : undefined}
                        color={props.theme === 'decrypt' ? 'primary' : undefined}
                    >
                        Decrypt
                    </Button>

                    <div style={{flexGrow: 1}} />

                    <Button onClick={clearRedis} size="small" style={{ color: '#a2a2a2' }}>Clear Redis cache</Button>
                </div>
            </div>

            {!!props.metamaskError &&
                <Dialog open>
                    <DialogTitle>{props.metamaskError.title}</DialogTitle>
                    <DialogContent className={classes.metamaskDialogContent}>
                        <img src={metamaskLogo} />
                        <Typography>
                            {props.metamaskError.message}
                        </Typography>
                    </DialogContent>
                </Dialog>
            }

            <SubmitContentDialog
                open={submitContentDialogOpen}
                onClose={() => setSubmitContentDialogOpen(false)}
                proposeCid={proposeCid}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                currentAccount={currentAccount}
                ethBalanceOf={props.ethBalanceOf}
                tokenBalanceOf={props.tokenBalanceOf}
            />
        </main>
    )
}

const useStyles = makeStyles(theme => createStyles({
    main: {
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        backgroundColor: theme.chart.bgColorBody,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 240,
        background: theme.chart.bgColorBackdrop,
        // boxShadow: '#000000b3 3px 1px 2px',
    },
    mainInner: {
        maxWidth: 1024,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
    },
    header: {
        display: 'flex',
        '& > *': {
            flexBasis: '50%',
        },

        marginTop: 30,
        marginBottom: 20,
    },
    headerLeft: {
        paddingTop: 10,
        paddingLeft: 8,
        paddingBottom: 14,
        display: 'flex',

        // '& > *': {
        //     display: 'inline',
        // },
    },
    logoImage: theme.chart.logoImageStyles,
    headerLeftTitle: theme.chart.pageTitleStyles,
    headerRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        paddingTop: 20,
        paddingBottom: 10,
        paddingRight: 8,
    },
    accountPickerWrapper: {
        display: 'flex',
        justifyContent: 'flex-end',
    },
    accountPickerInput: {
        fontSize: '0.8rem',
        padding: '0 32px 0 0',
    },
    accountBalances: {
        color: '#ec007f',
        // fontSize: '1.8rem',
        display: 'flex',
        alignItems: 'flex-end',

        fontFamily: 'Light Pixel',
        fontSize: '1.4rem',

        '& img': {
            marginRight: 12,
        },
    },
    ethBalance: {
        marginRight: 16,
    },
    ethereumLogo: {
        width: 32,
        verticalAlign: 'bottom',
        filter: 'hue-rotate(212deg) grayscale(33%) brightness(1.6)',
    },
    coinsGif: {
        width: 56,
        verticalAlign: 'bottom',
    },
    leaderboardCard: {
        display: 'flex',
        flexDirection: 'column',
    },
    leaderboardCardHeader: {
        display: 'flex',
        // '& > *': {
        //     flexBasis: '50%',
        // },

        '& > h2': {
            flexGrow: 1,
            fontSize: '2.6rem',
            marginTop: 0,
            fontFamily: theme.chart.fontCardHeader,
            color: theme.chart.fontColorCardHeader,
        },

        margin: '-16px -16px 0 -16px',
        padding: '16px 16px 12px 16px',
        backgroundColor: theme.chart.bgColorCardHeader,
    },
    bottomToolbar: {
        marginTop: 20,
        marginBottom: 60,
        display: 'flex',
    },
    fab: {
        height: 32,
    },
    loadingIndicatorWrapper: {
        textAlign: 'right',
        color: '#a0a0a0',
        fontSize: '0.8rem',
    },
    loadingIndicator: {
        marginLeft: 10,
        verticalAlign: 'bottom',
    },
    generateCid: {
        color: '#39b3f1',
        fontSize: '0.8rem',
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    btnOpenSubmitDialog: {
        color: theme.palette.primary.main,
        backgroundColor: 'white',
        boxShadow: '0px 1px 3px -1px rgba(0,0,0,0.2), 0px 2px 3px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
    },
    metamaskDialogContent: {
        display: 'flex',
        '& p': {
            marginTop: 10,
        },
    },
}))

const mapStateToProps = (state) => {
    return {
        theme: state.chart.theme,
        isLoading: state.chart.isLoading,
        accounts: state.chart.accounts,
        ethBalanceOf: state.chart.ethBalanceOf,
        tokenBalanceOf: state.chart.tokenBalanceOf,
        currentAccount: state.chart.currentAccount,
        metamaskError: state.chart.metamaskError,
    }
}

const mapDispatchToProps = {
    setCurrentAccount,
    getLeaderboardData,
    fetchTokenBalance,
    proposeCid,
    upvoteCid,
    withdrawCid,
    setIsLoading,
    setTheme,
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
