import { connect } from 'react-redux'
import { toggleMenu } from '../actions'
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
    }
  }
}

const SearchbarContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Searchbar)

export default SearchbarContainer
