import 'babel-polyfill'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import thunkMiddleware from 'redux-thunk'
import { createStore, applyMiddleware } from 'redux'
import reducers from './reducers'
import App from './components/App'

// Create the data store
let store = createStore(
  reducers,
  applyMiddleware(thunkMiddleware)
)

// Render the application
render(
  <Provider store={store}>
    <App/>
  </Provider>,
  document.getElementById('react')
)

// Fetch the data on load
//store.dispatch()
