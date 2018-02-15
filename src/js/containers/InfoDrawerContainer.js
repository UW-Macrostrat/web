import { connect } from 'react-redux'
import { toggleInfoDrawer, expandInfoDrawer, getColumn, getGdd } from '../actions'
import InfoDrawer from '../components/InfoDrawer'

const mapStateToProps = (state) => {
  return {
    infoDrawerOpen: state.update.infoDrawerOpen,
    infoDrawerExpanded: state.update.infoDrawerExpanded,
    mapInfo: state.update.mapInfo,
    fetchingMapInfo: state.update.fetchingMapInfo,
    fetchingColumnInfo: state.update.fectchingColumnInfo,
    fetchingGdd: state.update.fetchingGdd,
    columnInfo: state.update.columnInfo,
    infoMarkerLng: state.update.infoMarkerLng,
    infoMarkerLat: state.update.infoMarkerLat,
    gddInfo: state.update.gddInfo,
    activeIndexMap: state.update.activeIndexMap
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleInfoDrawer: () => {
      dispatch(toggleInfoDrawer())
    },
    expandInfoDrawer: () => {
      dispatch(expandInfoDrawer())
    },
    getColumn: (lng, lat) => {
      dispatch(getColumn(lng, lat))
    },
    getGdd: () => {
      dispatch(getGdd())
    }
  }
}

const InfoDrawerContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoDrawer)

export default InfoDrawerContainer
