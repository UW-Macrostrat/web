import 'babel-polyfill'

//https://material-ui.com/style/typography/#migration-to-typography-v2
window.__MUI_USE_NEXT_TYPOGRAPHY_VARIANTS__ = true

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import thunkMiddleware from 'redux-thunk'
import { createStore, applyMiddleware } from 'redux'
import reducers from './reducers'
import { getInitialMapState } from './actions'
import App from './components/App'

// Create the data store
let store = createStore(
  reducers,
  applyMiddleware(thunkMiddleware)
)

// Parse the URI on load
store.dispatch(getInitialMapState())

// Render the application
render(
  <Provider store={store}>
    <App/>
  </Provider>,
  document.getElementById('react')
)
