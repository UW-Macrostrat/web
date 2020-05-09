import React, { Component } from 'react'
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
          <div className="left-stack">
            <SearchbarContainer/>
            <MenuContainer/>
            <FiltersContainer/>
          </div>
          <InfoDrawerContainer/>
          <ElevationChartContainer/>
        </div>
      </div>
    )
  }
}

export default MapPage
