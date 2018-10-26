import { connect } from 'react-redux'
import { toggleMenu, toggleFilters, doSearch, addFilter, removeFilter } from '../actions'
import Searchbar from '../components/Searchbar'

const mapStateToProps = (state) => {
  return {
    isSearching: state.update.isSearching,
    searchResults: state.update.searchResults,
    filters: state.update.filters,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu())
    },
    toggleFilters: () => {
      dispatch(toggleFilters())
    },
    doSearch: (term) => {
      dispatch(doSearch(term))
    },
    addFilter: (f) => {
      dispatch(addFilter(f))
    },
    removeFilter: (f) => {
      dispatch(removeFilter(f))
    },
  }
}

const SearchbarContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Searchbar)

export default SearchbarContainer
