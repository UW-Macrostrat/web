import React, { Component } from "react";
import {
  Collapse,
  Navbar,
  Button,
  Intent,
  InputGroup,
  Card,
} from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import classNames from "classnames";
import { useDispatch, useSelector, useStore } from "react-redux";
import {
  toggleMenu,
  toggleFilters,
  doSearch,
  addFilter,
  useActionDispatch,
} from "../actions";

const categoryTitles = {
  lithology: "Lithologies",
  interval: "Time Intervals",
  place: "Places (via Mapbox)",
  strat_name: "Stratigraphic Names",
  environ: "Environments (columns only)",
};

const sortOrder = {
  interval: 1,
  lithology: 2,
  strat_name: 3,
  environ: 4,
  place: 5,
};

function SearchResults({ searchResults, onSelectResult }) {
  console.log(searchResults);
  if (searchResults == null) return null;
  if (searchResults.length == 0) return h("p", "No results found");

  const resultCategories = new Set(searchResults.map((d) => d.category));
  // Force the results into a particular order
  let resultCategoriesArr = Array.from(resultCategories);
  resultCategoriesArr.sort((a: string, b: string) => {
    return sortOrder[a] - sortOrder[b];
  });

  let categoryResults = resultCategoriesArr.map((cat) => {
    let thisCat = searchResults.filter((f) => f.category === cat);
    return thisCat.map((item, key) => {
      return h(
        "li",
        {
          key,
          onClick() {
            onSelectResult(item);
          },
        },
        item.name
      );
    });
  });

  return h(
    resultCategoriesArr.map((cat, i) => {
      return (
        <div key={`subheader-${i}`}>
          <h3 className="searchresult-header">{categoryTitles[cat]}</h3>
          <ul>{categoryResults[i]}</ul>
        </div>
      );
    })
  );
}

class Searchbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputFocused: false,
      searchTerm: "",
    };
    this.gainInputFocus = this.gainInputFocus.bind(this);
    this.loseInputFocus = this.loseInputFocus.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.addFilter = this.addFilter.bind(this);
  }

  gainInputFocus() {
    //  console.log('focus')
    this.setState({
      inputFocused: true,
    });
  }
  loseInputFocus() {
    //  console.log('lose focus')
    // A slight timeout is required so that click actions can occur
    setTimeout(() => {
      this.setState({
        inputFocused: false,
      });
    }, 100);
  }
  handleSearchInput(event) {
    this.setState({ searchTerm: event.target.value });
    if (event.target.value.length <= 2) {
      return;
    }
    this.props.doSearch(event.target.value);
  }
  addFilter(f) {
    this.setState({
      searchTerm: "",
    });
    this.props.addFilter(f);
  }

  render() {
    const { toggleMenu, toggleFilters } = this.props;
    const { addFilter } = this;

    const { searchResults } = this.props;

    let searchResultClasses = classNames(
      { hidden: this.state.searchTerm.length < 3 },
      "search-results"
    );

    let filterButton = (
      <Button
        disabled={false}
        icon="filter"
        minimal
        aria-label="Filter"
        intent={Intent.PRIMARY}
        onClick={toggleFilters}
      />
    );

    return (
      <div className="searchbar-holder">
        <div className="navbar-holder">
          <Navbar className="searchbar panel">
            <InputGroup
              large={true}
              //leftIcon="search"
              onChange={this.handleSearchInput}
              onFocus={this.gainInputFocus}
              onBlur={this.loseInputFocus}
              placeholder="Search Macrostrat..."
              rightElement={filterButton}
              value={this.state.searchTerm}
            />
            <Button
              icon="menu"
              aria-label="Menu"
              large
              onClick={toggleMenu}
              minimal
            />
          </Navbar>
        </div>
        <Collapse
          isOpen={this.state.inputFocused}
          className="search-results-container panel"
        >
          <Card
            className={classNames(
              { hidden: this.state.searchTerm.length != 0 },
              "search-guidance"
            )}
          >
            {h(SearchGuidance)}
          </Card>
          <Card className={searchResultClasses}>
            {h(SearchResults, {
              searchResults,
              onSelectResult: addFilter,
            })}
          </Card>
        </Collapse>
      </div>
    );
  }
}

function SearchGuidance() {
  return h(
    "div.search-guidance",
    <>
      <h5>Available categories:</h5>
      <ul>
        <li>Time intervals</li>
        <li>Lithologies</li>
        <li>Stratigraphic Names</li>
        <li>Environments (columns only)</li>
        <li>Places</li>
      </ul>
    </>
  );
}

function SearchbarContainer(props) {
  /** A replacement for the connect component */
  const { isSearching, searchResults, filters } = useSelector(
    (state) => state.update
  );
  const dispatch = useActionDispatch();

  const rest = {
    toggleMenu: () => {
      dispatch({ type: "toggle-menu" });
    },
    toggleFilters: () => {
      dispatch({ type: "toggle-filters" });
    },
    doSearch: (term) => {
      dispatch(doSearch(term));
    },
    addFilter: (f) => {
      dispatch(addFilter(f));
    },
    isSearching,
    searchResults,
    filters,
  };

  return h(Searchbar, { ...props, ...rest });
}

export default SearchbarContainer;
