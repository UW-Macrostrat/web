import { connect } from 'react-redux'
import { toggleMenu, toggleBedrock, toggleSatellite, toggleColumns, toggleFossils, toggleAbout, toggleElevationChart } from '../actions'
import Menu from '../components/Menu'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
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
