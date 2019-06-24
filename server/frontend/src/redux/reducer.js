import { combineReducers } from 'redux'

import chartReducer from './chartReducer'

const appReducer = combineReducers({
    chart: chartReducer,
})

const rootReducer = (state, action) => {
    return appReducer(state, action)
}

export default rootReducer