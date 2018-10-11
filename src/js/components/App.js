import React, { Component } from 'react'
import {
  BrowserRouter as Router,
  Route,
  Redirect
} from 'react-router-dom'

// Import other components
import MapContainer from '../containers/MapContainer'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
import FiltersContainer from '../containers/FiltersContainer'
import AboutContainer from '../containers/AboutContainer'
import ElevationChartContainer from '../containers/ElevationChartContainer'

class MapPage extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div id="map-page">
        <MapContainer/>
        <div className="ui">
          <MenuContainer/>
          <SearchbarContainer/>
          <InfoDrawerContainer/>
          <FiltersContainer/>
          <AboutContainer/>
          <ElevationChartContainer/>
        </div>
      </div>
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <Router>
        <div id="app-holder">
          <Route path="/map" component={MapPage} />
          <Redirect from="/" exact to="/map" />
        </div>
      </Router>
    )
  }
}


export default App
