import React, { Component } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Redirect
} from 'react-router-dom'

import MapPage from './MapPage'
import SectionPage from '../../columns'

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <Router>
        <div id="app-holder">
          <Route path="/map" component={MapPage} />
          <Route path="/columns" component={SectionPage} />
          <Route exact path="/" render={() => <Redirect to="/map" />} />
        </div>
      </Router>
    )
  }
}


export default App
