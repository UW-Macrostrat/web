import React, { useState } from "react";
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
import { useAppActions, useSearchState } from "../reducers";

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

function Searchbar(props) {
  const runAction = useAppActions();
  const { searchResults } = useSearchState();

  const [barState, setbarState] = useState({
    inputFocused: false,
    searchTerm: "",
  });

  const gainInputFocus = () => {
    setbarState((prevState) => {
      return {
        ...prevState,
        inputFocused: true,
      };
    });
  };
  const loseInputFocus = () => {
    //  console.log('lose focus')
    // A slight timeout is required so that click actions can occur
    setTimeout(() => {
      setbarState((prevState) => {
        return {
          ...prevState,
          inputFocused: false,
        };
      });
    }, 100);
  };
  const handleSearchInput = (event) => {
    setbarState((prevState) => {
      return { ...prevState, searchTerm: event.target.value };
    });
    if (event.target.value.length <= 2) {
      return;
    }
    runAction({ type: "fetch-search-query", term: barState.searchTerm });
  };

  const addFilter = (f) => {
    setbarState((prevState) => {
      return { ...prevState, searchTerm: "" };
    });
    console.log("Filter", f);
    runAction({ type: "async-add-filter", filter: f });
  };

  const toggleMenu = () => {
    runAction({ type: "toggle-menu" });
  };

  const toggleFilters = () => {
    runAction({ type: "toggle-filters" });
  };

  let searchResultClasses = classNames(
    { hidden: barState.searchTerm.length < 3 },
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
            onChange={handleSearchInput}
            onFocus={gainInputFocus}
            onBlur={loseInputFocus}
            placeholder="Search Macrostrat..."
            rightElement={filterButton}
            value={barState.searchTerm}
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
        isOpen={barState.inputFocused}
        className="search-results-container panel"
      >
        <Card
          className={classNames(
            { hidden: barState.searchTerm.length != 0 },
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

  return h(Searchbar, { ...props });
}

export default SearchbarContainer;
