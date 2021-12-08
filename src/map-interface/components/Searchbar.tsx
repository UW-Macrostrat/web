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
import Filters from "./Filters";

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

function SearchResults() {
  const { searchResults } = useSearchState();
  const runAction = useAppActions();

  if (searchResults == null) {
    return h("div", [h(Filters), h(SearchGuidance)]);
  }
  const onSelectResult = (f) => {
    runAction({ type: "set-search-term", term: "" });
    runAction({ type: "async-add-filter", filter: f });
    runAction({ type: "received-search-query", data: null });
  };
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

  return h("div", [
    h(Filters),
    h.if(searchResults.length == 0)("p.search-guidence", [
      "No results, try again.",
    ]),
    h.if(searchResults.length > 0)("div.search-results", [
      resultCategoriesArr.map((cat, i) => {
        return h("div", { key: `subheader-${i}` }, [
          h("h3.searchresult-header", [categoryTitles[cat]]),
          h("ul", [categoryResults[i]]),
        ]);
      }),
    ]),
  ]);
}

function Searchbar(props) {
  const runAction = useAppActions();
  const { term, inputFocus } = useSearchState();
  // const [barState, setbarState] = useState({
  //   inputFocus: false,
  // });

  const gainInputFocus = () => {
    runAction({ type: "set-input-focus", inputFocus: true });
  };
  const loseInputFocus = () => {
    // A slight timeout is required so that click actions can occur
    setTimeout(() => {
      runAction({ type: "set-input-focus", inputFocus: false });
    }, 100);
  };
  const handleSearchInput = (event) => {
    runAction({ type: "set-search-term", term: event.target.value });
    if (event.target.value.length <= 2) {
      return;
    }
    runAction({ type: "fetch-search-query", term: term });
  };

  const toggleMenu = () => {
    runAction({ type: "toggle-menu" });
  };

  const toggleFilters = () => {
    runAction({ type: "toggle-filters" });
  };

  let filterButton = (
    <Button
      disabled={false}
      icon="filter"
      minimal
      aria-label="Filter"
      intent={Intent.PRIMARY}
      onClick={gainInputFocus}
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
            value={term}
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
      {/* <Collapse isOpen={inputFocus} className="search-results-container panel"> */}
      {/* <Card
          className={classNames(
            { hidden: barState.searchTerm.length != 0 },
            "search-guidance"
          )}
        >
          {h(SearchGuidance)}
        </Card> */}
      {/* <Card className={searchResultClasses}>{h(SearchResults)}</Card> */}
      {/* </Collapse> */}
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
export { SearchResults };
