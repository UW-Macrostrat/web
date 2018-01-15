import { connect } from 'react-redux'
import { toggleMenu, toggleBedrock } from '../actions'
import Menu from '../components/Menu'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    mapHasBedrock: state.update.mapHasBedrock
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu())
    },
    toggleBedrock: () => {
      dispatch(toggleBedrock())
    }
  }
}

const MenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Menu)

export default MenuContainer
