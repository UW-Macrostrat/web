import { connect } from 'react-redux'
import { toggleMenu, toggleBedrock, toggleSatellite } from '../actions'
import Menu from '../components/Menu'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite
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
    }
  }
}

const MenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Menu)

export default MenuContainer
