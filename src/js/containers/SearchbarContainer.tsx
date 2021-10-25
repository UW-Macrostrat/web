import { connect } from "react-redux";
import {
  toggleMenu,
  toggleFilters,
  doSearch,
  addFilter,
  removeFilter,
} from "../actions";
import Searchbar from "../components/Searchbar";

const mapStateToProps = (state) => {
  return {
    isSearching: state.update.isSearching,
    searchResults: state.update.searchResults,
    filters: state.update.filters,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu());
    },
    toggleFilters: () => {
      dispatch(toggleFilters());
    },
    doSearch: (term) => {
      dispatch(doSearch(term));
    },
    addFilter: (f) => {
      dispatch(addFilter(f));
    },
    removeFilter: (f) => {
      dispatch(removeFilter(f));
    },
    swapLithType: (f) => {
      // Copy the filter, otherwise all hell breaks loose
      let newFilter = JSON.parse(JSON.stringify(f));

      // Swap the style of filter
      if (newFilter.type.substr(0, 4) === "all_") {
        newFilter.type = newFilter.type.replace("all_", "");
      } else {
        newFilter.type = `all_${newFilter.type}`;
      }

      dispatch(addFilter(newFilter));
    },
  };
};

const SearchbarContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Searchbar);

export default SearchbarContainer;
