import React from 'react'
// Import other components
import MapContainer from './map-view'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
import FiltersContainer from '../containers/FiltersContainer'
import AboutContainer from '../containers/AboutContainer'
import ElevationChartContainer from '../containers/ElevationChartContainer'

const MapPage = ()=> {
  return (
    <div id="map-page">
      <MapContainer/>
      <div className="ui">
        <div className="left-stack">
          <SearchbarContainer/>
          <MenuContainer/>
          <FiltersContainer/>
          <AboutContainer/>
        </div>
        <InfoDrawerContainer/>
        <ElevationChartContainer/>
      </div>
    </div>
  )
}

export default MapPage
