import React, { Component } from 'react'

// Import other components
import MapContainer from '../containers/MapContainer'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
import AboutContainer from '../containers/AboutContainer'
import ElevationChartContainer from '../containers/ElevationChartContainer'

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div id="app-holder">
        <MapContainer/>
        <div className="ui">
          <MenuContainer/>
          <SearchbarContainer/>
          <InfoDrawerContainer/>
          <AboutContainer/>
          <ElevationChartContainer/>
        </div>
      </div>
    )
  }
}

export default App
