import { connect } from 'react-redux'
import { toggleMenu } from '../actions'
import Menu from '../components/Menu'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu())
    }
  }
}

const MenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Menu)

export default MenuContainer
