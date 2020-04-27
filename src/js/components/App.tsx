import React, { Component } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Redirect
} from 'react-router-dom'

import '../../styles/index.styl'
import MapPage from './MapPage'
//import ColumnPage from '../../columns'

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    // Column page temporarily removed
    return (
      <Router>
        <div id="app-holder">
          <Route path="/map" component={MapPage} />
          <Route exact path="/" render={() => <Redirect to="/map" />} />
        </div>
      </Router>
    )
  }
}


export default App