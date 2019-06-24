import React from 'react'
import clsx from 'clsx'
import { makeStyles, createStyles } from '@material-ui/styles'
import FormHelperText from '@material-ui/core/FormHelperText'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import IconButton from '@material-ui/core/IconButton'
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward'


function SortByDropdown({ orderBy, direction, onChangeOrderBy, onChangeDirection }) {
    const classes = useStyles()

    const otherDirection = direction === 'asc' ? 'desc' : 'asc'

    return (
        <div className={classes.root}>
            <div>
                <FormHelperText component="span">Sort by </FormHelperText>
                <Select
                    value={orderBy}
                    onChange={evt => onChangeOrderBy(evt.target.value)}
                    className={classes.selectSortBy}
                    classes={{ select: classes.selectSortByInner }}
                >
                    <MenuItem value="score">score</MenuItem>
                    <MenuItem value="allTimeUpvotes"># upvotes</MenuItem>
                    <MenuItem value="proposalTimestamp">when submitted</MenuItem>
                    <MenuItem value="withdrawableBalance">withdrawable tokens</MenuItem>
                </Select>
            </div>

            <div className={classes.directionButton}>
                <IconButton
                    size="small"
                    onClick={() => onChangeDirection(otherDirection)}
                >
                    <ArrowDownwardIcon className={clsx(classes.arrow, direction === 'asc' && classes.rotatedArrow)} />
                </IconButton>
            </div>
        </div>
    )
}

const useStyles = makeStyles(theme => createStyles({
    root: {
        fontSize: '0.8rem',
        marginBottom: 20,
        display: 'flex',
    },
    selectSortBy: {
        fontSize: '0.8rem',
        marginLeft: 4,
    },
    selectSortByInner: {
        paddingTop: 0,
        paddingBottom: 1,
    },
    arrow: {
        transition: 'transform 200ms',
    },
    rotatedArrow: {
        transition: 'transform 200ms',
        transform: 'rotate(180deg)',
    },
    directionButton: {
        marginTop: -5,
        marginLeft: 4,
    },
}))

export default SortByDropdown