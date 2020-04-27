import React, {useState} from 'react'
// Import other components
import MapContainer from './map-view'
import h from '@macrostrat/hyper'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
import FiltersContainer from '../containers/FiltersContainer'
import AboutContainer from '../containers/AboutContainer'
import ElevationChartContainer from '../containers/ElevationChartContainer'
import {ButtonGroup, Button} from '@blueprintjs/core'
import CesiumView from './cesium-view'

enum MapBackend { MAPBOX, CESIUM }

const MapView = (props: {backend: MapBackend}) =>{
  switch (props.backend) {
  case MapBackend.MAPBOX:
    return h(MapContainer)
  case MapBackend.CESIUM:
    return h(CesiumView)
  }
}

type TypeSelectorProps = {
  backend: MapBackend,
  setBackend(b: MapBackend): void
}

const MapTypeSelector = (props: TypeSelectorProps)=>{
  const {backend, setBackend} = props
  return h(ButtonGroup, {className: 'map-type-selector'}, [
    h(Button, {
      active: backend==MapBackend.MAPBOX,
      onClick() { setBackend(MapBackend.MAPBOX)}
    }, "2D"),
    h(Button, {
      active: backend==MapBackend.CESIUM,
      onClick() { setBackend(MapBackend.CESIUM)}
    }, "3D")
  ])
}

const MapPage = ()=> {

  const [backend, setBackend] = useState(MapBackend.MAPBOX)

  return (
    <div id="map-page">
      <MapView backend={backend} />
      <div className="ui">
        <div className="left-stack">
          <SearchbarContainer/>
          <MenuContainer/>
          <FiltersContainer/>
          <AboutContainer/>
          <MapTypeSelector backend={backend} setBackend={setBackend} />
        </div>
        <InfoDrawerContainer/>
        <ElevationChartContainer/>
      </div>
    </div>
  )
}

export default MapPage
