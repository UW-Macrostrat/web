import React, { Component, PropTypes } from 'react'
import MainContainer from '../containers/MainContainer'
import MapContainer from '../containers/MapContainer'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
import FiltersContainer from '../containers/FiltersContainer'
import AboutContainer from '../containers/AboutContainer'
import ElevationChartContainer from '../containers/ElevationChartContainer'
// Import other components

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <div className="ui">
          <MenuContainer/>
          <SearchbarContainer/>
          <InfoDrawerContainer/>
          <FiltersContainer/>
          <AboutContainer/>
          <ElevationChartContainer/>
        </div>
        <MapContainer/>
      </div>
    )
  }
}

export default App
