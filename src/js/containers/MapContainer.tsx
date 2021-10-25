import { connect } from 'react-redux'
import { queryMap, closeInfoDrawer, getFilteredColumns, getElevation, getPBDB, mapMoved, resetPbdb } from '../actions'
import Map from '../components/Map'

const mapStateToProps = (state) => {
  return {
    filters: state.update.filters,
    filteredColumns: state.update.filteredColumns,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasLines: state.update.mapHasLines,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
    mapCenter: state.update.mapCenter,
    elevationChartOpen: state.update.elevationChartOpen,
    elevationData: state.update.elevationData,
    elevationMarkerLocation: state.update.elevationMarkerLocation,
    mapXYZ: state.update.mapXYZ,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    queryMap: (lng, lat, z, map_id, column) => {
      dispatch(queryMap(lng, lat, z, map_id, column))
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
    resetPbdb: () => {
      dispatch(resetPbdb())
    },
    mapMoved: (data) => {
      dispatch(mapMoved(data))
    },
    closeInfoDrawer: () => {
      dispatch(closeInfoDrawer())
    }
  }
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Map)

export default MapContainer
