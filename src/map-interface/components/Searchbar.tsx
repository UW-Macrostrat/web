import React, { useCallback, useMemo } from "react";
import {
  Navbar,
  Button,
  InputGroup,
  Card,
  Spinner,
  useHotkeys,
  NonIdealState,
} from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { useAppActions, useMenuState, useSearchState } from "../app-state";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { SubtleFilterText } from "./filters-panel";
import classNames from "classnames";

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

  // This is crazy
  const onSelectResult = useCallback(
    (f) => {
      runAction({ type: "set-search-term", term: "" });
      runAction({ type: "async-add-filter", filter: f });
      runAction({ type: "received-search-query", data: null });
    },
    [runAction]
  );

  if (searchResults == null) {
    return h(SearchGuidance);
  }

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
        h("div.text", [item.name])
      );
    });
  });

  if (searchResults.length === 0) {
    return h("div.no-results", "No results found");
  }

  return h("div.search-results", [
    resultCategoriesArr.map((cat, i) => {
      return h("div", { key: `subheader-${i}` }, [
        h("div.searchresult-header", [h("div.text", [categoryTitles[cat]])]),
        h("ul", [categoryResults[i]]),
      ]);
    }),
  ]);
}

function MenuButton() {
  const runAction = useAppActions();
  const mapIsLoading = useSelector((state) => state.core.mapIsLoading);
  const { menuOpen } = useMenuState();

  let buttonProps = {
    icon: mapIsLoading ? h(Spinner, { size: 16 }) : "menu",
    large: true,
    minimal: true,
    onClick() {
      runAction({ type: "toggle-menu" });
    },
  };

  return h(Button, {
    ...buttonProps,
    "aria-label": "Menu",
    active: menuOpen && !mapIsLoading,
  });
}

function Searchbar(props) {
  const runAction = useAppActions();
  const { className } = props;
  const { term, searchResults, infoDrawerOpen } = useSearchState();

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

  useEffect(() => {
    if (term == "" && searchResults != null) {
      runAction({ type: "received-search-query", data: null });
    }
  }, [term]);

  return (
    <div className={classNames("searchbar-holder", className)}>
      <div className="navbar-holder">
        <Navbar className="searchbar panel">
          <InputGroup
            large={true}
            onChange={handleSearchInput}
            onFocus={gainInputFocus}
            onBlur={loseInputFocus}
            rightElement={h(MenuButton)}
            placeholder="Search Macrostrat..."
            value={term}
          />
        </Navbar>
      </div>
      <SubtleFilterText />
    </div>
  );
}

function SearchGuidance() {
  return h(
    "div.search-guidance.bp3-text",
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

export default Searchbar;
export { SearchResults };
