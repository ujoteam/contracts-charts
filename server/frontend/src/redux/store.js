import { createStore, compose, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import reducer from './reducer'

const store = function() {
    // Redux DevTools
    const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

    const enhancer = composeEnhancers(
        applyMiddleware(thunk)
    )

    const initialState = {}

    const store = createStore(
        reducer,
        initialState,
        enhancer
    )

    // Enable Webpack hot module replacement for reducers
    if (module.hot) {
        module.hot.accept('./reducer', () => {
            const nextReducers = require('./reducer').default
            store.replaceReducer(nextReducers)
        })
    }

    return store
}()

export default store

