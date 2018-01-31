import { connect } from 'react-redux'
import { queryMap, closeInfoDrawer, getFilteredColumns } from '../actions'
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
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    queryMap: (lng, lat, z) => {
      dispatch(queryMap(lng, lat, z))
    },
    closeInfoDrawer: () => {
      dispatch(closeInfoDrawer())
    },
    getFilteredColumns: () => {
      dispatch(getFilteredColumns())
    }
  }
}

const MapContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Map)

export default MapContainer
