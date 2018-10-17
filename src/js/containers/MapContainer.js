import { connect } from 'react-redux'
import { queryMap, closeInfoDrawer, getFilteredColumns, getElevation, getPBDB, mapMoved } from '../actions'
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
    mapHasLines: state.update.mapHasLines,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
    mapCenter: state.update.mapCenter,
    elevationChartOpen: state.update.elevationChartOpen,
    elevationData: state.update.elevationData,
    fetchingElevation: state.update.fetchingElevation,
    mapXYZ: state.update.mapXYZ,
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
    getElevation: (line) => {
      dispatch(getElevation(line))
    },
    getPBDB: (collection_nos) => {
      dispatch(getPBDB(collection_nos))
    },
    mapMoved: (data) => {
      dispatch(mapMoved(data))
    },
  }
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Map)

export default MapContainer
