import { connect } from 'react-redux'
import { toggleFilters, removeFilter } from '../actions'
import Filters from '../components/Filters'

const mapStateToProps = (state) => {
  return {
    filtersOpen: state.update.filtersOpen,
    filters: state.update.filters
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleFilters: () => {
      dispatch(toggleFilters())
    },
    removeFilter: (f) => {
      dispatch(removeFilter(f))
    }
  }
}

const FiltersContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Filters)

export default FiltersContainer
