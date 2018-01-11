import { connect } from 'react-redux'
import { toggleMenu } from '../actions'
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
    }
  }
}

const FiltersContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Filters)

export default FiltersContainer
