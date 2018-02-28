import { connect } from 'react-redux'
import { toggleMenu, toggleBedrock, toggleSatellite, toggleColumns, toggleIndexMap, toggleFossils, toggleAbout, toggleElevationChart } from '../actions'
import Menu from '../components/Menu'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasIndexMap: state.update.mapHasIndexMap,
    mapHasFossils: state.update.mapHasFossils
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu())
    },
    toggleBedrock: () => {
      dispatch(toggleBedrock())
    },
    toggleSatellite: () => {
      dispatch(toggleSatellite())
    },
    toggleColumns: () => {
      dispatch(toggleColumns())
    },
    toggleIndexMap: () => {
      dispatch(toggleIndexMap())
    },
    toggleFossils: () => {
      dispatch(toggleFossils())
    },
    toggleAbout: () => {
      dispatch(toggleAbout())
    },
    toggleElevationChart: () => {
      dispatch(toggleElevationChart())
    }
  }
}

const MenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Menu)

export default MenuContainer
