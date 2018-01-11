import { connect } from 'react-redux'
import { toggleMenu, toggleFilters } from '../actions'
import Searchbar from '../components/Searchbar'

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu())
    },
    toggleFilters: () => {
      dispatch(toggleFilters())
    }
  }
}

const SearchbarContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Searchbar)

export default SearchbarContainer
