import { connect } from 'react-redux'
import { toggleInfoDrawer, expandInfoDrawer, getColumn } from '../actions'
import InfoDrawer from '../components/InfoDrawer'

const mapStateToProps = (state) => {
  return {
    infoDrawerOpen: state.update.infoDrawerOpen,
    infoDrawerExpanded: state.update.infoDrawerExpanded,
    mapInfo: state.update.mapInfo,
    fetchingMapInfo: state.update.fetchingMapInfo,
    fetchingColumnInfo: state.update.fectchingColumnInfo,
    columnInfo: state.update.columnInfo,
    infoMarkerLng: state.update.infoMarkerLng,
    infoMarkerLat: state.update.infoMarkerLat
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
    }
  }
}

const InfoDrawerContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoDrawer)

export default InfoDrawerContainer
