import React, { useRef, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import sortBy from 'lodash/sortBy'
import moment from 'moment'
import { makeStyles, createStyles } from '@material-ui/styles'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import TableSortLabel from '@material-ui/core/TableSortLabel'
import IconButton from '@material-ui/core/IconButton'
import Fab from '@material-ui/core/Fab'
import Tooltip from '@material-ui/core/Tooltip'
import ThumbUpIcon from '@material-ui/icons/ThumbUp'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'
import SendIcon from '@material-ui/icons/Send'
import Theme from './Theme'
import { H3, H4, H5 } from './Typography'
import { upvoteCid, withdrawCid } from './redux/chartActions'
import { timeout } from './utils'
import * as fetch from './fetch'

import './fonts/fonts.css'
import 'typeface-roboto'

const tableHeaders = {
    cid: 'cid',
    score: 'score',
    allTimeUpvotes: 'upvotes',
    numUpvoters: '# voters',
    upvoteIndex: 'upvote index',
    proposalTimestamp: 'submitted',
    withdrawableBalance: 'your earnings',
}

function SortableColHeader({ field, orderBy, order, onClickSortHeader, classes }) {
    return (
        <TableCell sortDirection={orderBy === field ? order : false} classes={{ root: classes.tableCell }}>
            <TableSortLabel
                active={orderBy === field}
                direction={order}
                onClick={() => onClickSortHeader(field)}
            >
                {tableHeaders[field]}
            </TableSortLabel>
        </TableCell>
    )
}

function LeaderboardTable(props) {
    const { onClickUpvoteCid, onClickWithdrawCid } = props
    const [ order, setOrder ] = useState('desc')
    const [ orderBy, setOrderBy ] = useState('score')

    const classes = useStyles()

    let leaderboardData = props.leaderboardData.map((item, i) => ({
        rank: i,
        cid: item.cid,
        score: parseFloat(item.score) * 1000,
        allTimeUpvotes: item.allTimeUpvotes,
        numUpvoters: item.numUpvoters,
        upvoteIndex: props.upvoteIndices[item.cid].eq(0) ? '-' : props.upvoteIndices[item.cid].toString(),
        submittedInBlock: item.submittedInBlock,
        withdrawableBalance: props.withdrawableBalances[item.cid].toFixed(2),
        proposalTimestamp: item.proposalTimestamp,
    }))
    leaderboardData = sortBy(leaderboardData, orderBy)
    if (order === 'desc') {
        leaderboardData.reverse()
    }

    function onClickSortHeader(colName) {
        if (orderBy === colName) {
            setOrder(order === 'asc' ? 'desc' : 'asc')
        } else {
            setOrderBy(colName)
        }
    }


    return (
        <div>
            <Table className={classes.leaderboardTable}>
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        {Object.keys(tableHeaders).map(field => (
                            <SortableColHeader
                                key={field}
                                field={field}
                                orderBy={orderBy}
                                order={order}
                                onClickSortHeader={onClickSortHeader}
                                classes={classes}
                            />
                        ))}
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {leaderboardData.map(item => {
                        const canUpvote = item.upvoteIndex === '-'
                        const canWithdraw = parseFloat(item.withdrawableBalance) > 0
                        return (
                        <TableRow key={item.cid} className={classes.tableRow}>
                            <TableCell classes={{ root: classes.tableCell }}>{item.rank+1}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.cid.slice(0, 16)}...</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.score.toFixed(4)}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.allTimeUpvotes}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.numUpvoters}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.upvoteIndex}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{moment(item.proposalTimestamp*1000).fromNow()}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }}>{item.withdrawableBalance}</TableCell>
                            <TableCell classes={{ root: classes.tableCell }} className={classes.tableCellActions}>
                                <div className={classes.tableCellActionsInner}>
                                    <Tooltip title="Upvote">
                                        <IconButton onClick={canUpvote ? () => onClickUpvoteCid(item.cid) : null} size="small">
                                            <ThumbUpIcon className={canUpvote ? '' : classes.iconButtonDisabled} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Withdraw">
                                        <IconButton onClick={canWithdraw ? () => onClickWithdrawCid(item.cid) : null} size="small"style={{ marginLeft: 20 }}>
                                            <ExitToAppIcon className={canWithdraw ? '' : classes.iconButtonDisabled} />
                                        </IconButton>
                                    </Tooltip>
                                </div>
                            </TableCell>
                        </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
            {leaderboardData.length === 0 &&
                <div>The leaderboard is currently empty.</div>
            }
        </div>

    )
}

const useStyles = makeStyles(theme => createStyles({
    leaderboardTable: {
        margin: '20px 0',
    },
    tableRow: {
        '&:hover': {
            '& $tableCellActions': {
                opacity: 1,
                transition: 'opacity 50ms',
            },
        },
    },
    tableCell: {
        padding: '4px 20px 4px 16px',
    },
    tableCellActions: {
        opacity: 0,
        transition: 'opacity 50ms',
    },
    iconButtonDisabled: {},
    tableCellActionsInner: {
        display: 'flex',
        '& svg': {
            cursor: 'pointer',
            fill: '#ec007f',
        },
        '& $iconButtonDisabled': {
            cursor: 'unset',
            fill: '#d3d3d3',
        },
    },
}))

const mapStateToProps = (state) => {
    return {
        leaderboardData: state.chart.leaderboardData,
        withdrawableBalances: state.chart.withdrawableBalances,
        upvoteIndices: state.chart.upvoteIndices,
    }
}

const mapDispatchToProps = {
    upvoteCid,
    withdrawCid,
}

export default connect(mapStateToProps, mapDispatchToProps)(LeaderboardTable)
