import { connect } from 'react-redux'
import { queryMap, closeInfoDrawer, getFilteredColumns, setActiveIndexMap, getElevation } from '../actions'
import Map from '../components/Map'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    infoDrawerOpen: state.update.infoDrawerOpen,
    infoDrawerExpanded: state.update.infoDrawerExpanded,
    filtersOpen: state.update.filtersOpen,
    filters: state.update.filters,
    filteredColumns: state.update.filteredColumns,
    mapInfo: state.update.mapInfo,
    fetchingMapInfo: state.update.fetchingMapInfo,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasIndexMap: state.update.mapHasIndexMap,
    mapCenter: state.update.mapCenter,
    elevationChartOpen: state.update.elevationChartOpen,
    elevationData: state.update.elevationData,
    fetchingElevation: state.update.fetchingElevation
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    queryMap: (lng, lat, z, map_id) => {
      dispatch(queryMap(lng, lat, z, map_id))
    },
    closeInfoDrawer: () => {
      dispatch(closeInfoDrawer())
    },
    getFilteredColumns: () => {
      dispatch(getFilteredColumns())
    },
    setActiveIndexMap: (data) => {
      dispatch(setActiveIndexMap(data))
    },
    getElevation: (line) => {
      dispatch(getElevation(line))
    }
  }
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Map)

export default MapContainer
