import React from "react";
import { Navbar, Button, InputGroup, Card } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { useAppActions, useSearchState } from "../reducers";
import { useEffect } from "react";
import { SubtleFilterText } from "./Filters";

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
    return h(Card, [h(SearchGuidance)]);
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
    h.if(searchResults.length == 0)(Card, ["No results, try again."]),
    h.if(searchResults.length > 0)(Card, { className: "search-results" }, [
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
  const { term, searchResults } = useSearchState();

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

  useEffect(() => {
    if (term == "" && searchResults != null) {
      runAction({ type: "received-search-query", data: null });
    }
  }, [term]);

  const MenuButton = (
    <Button icon="menu" aria-label="Menu" large onClick={toggleMenu} minimal />
  );

  return (
    <div className="searchbar-holder">
      <div className="navbar-holder">
        <Navbar className="searchbar panel">
          <InputGroup
            large={true}
            onChange={handleSearchInput}
            onFocus={gainInputFocus}
            onBlur={loseInputFocus}
            rightElement={MenuButton}
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

export default Searchbar;
export { SearchResults };
