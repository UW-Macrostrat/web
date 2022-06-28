import { useCallback, useRef, useEffect } from "react";
import { Navbar, Button, InputGroup, Spinner, Card } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAppActions, useMenuState, useSearchState } from "../app-state";
import { useSelector } from "react-redux";
import { SubtleFilterText } from "./filters-panel";
import styles from "./searchbar.styl";
import { PanelSubhead } from "./expansion-panel/headers";
import classNames from "classnames";
import { useNavigate } from "react-router";

const h = hyper.styled(styles);

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

function ResultList({ searchResults }) {
  const runAction = useAppActions();
  const onSelectResult = useCallback(
    (f) => {
      runAction({ type: "async-add-filter", filter: f });
    },
    [runAction]
  );

  if (searchResults == null) return h(SearchGuidance);
  if (searchResults.length === 0) {
    return h("div.no-results", "No results found");
  }
  const resultCategories = new Set(searchResults.map((d) => d.category));
  // Force the results into a particular order
  let resultCategoriesArr = Array.from(resultCategories);
  resultCategoriesArr.sort((a: string, b: string) => {
    return sortOrder[a] - sortOrder[b];
  });

  return h("div.search-results", [
    resultCategoriesArr.map((cat: string, i: number) => {
      return h("div.search-result-category", { key: `subheader-${i}` }, [
        h(PanelSubhead, {
          className: "search-result-header",
          title: categoryTitles[cat],
        }),
        h(
          "ul",
          null,
          searchResults
            .filter((f) => f.category === cat)
            .map((item, key) => {
              return h(
                "li.search-result-row",
                {
                  key,
                  onClick() {
                    onSelectResult(item);
                  },
                },
                item.name
              );
            })
        ),
      ]);
    }),
  ]);
}

function SearchResults({ className }) {
  const { searchResults } = useSearchState();
  className = classNames(className, "search-results-card");

  return h(Card, { className }, h(ResultList, { searchResults }));
}

function MenuButton() {
  const runAction = useAppActions();
  const mapIsLoading = useSelector((state) => state.core.mapIsLoading);
  const { menuOpen } = useMenuState();
  const navigate = useNavigate();

  let buttonProps = {
    icon: mapIsLoading ? h(Spinner, { size: 16 }) : "menu",
    large: true,
    minimal: true,
    onClick(e) {
      e.stopPropagation();
      navigate("/layers");
      //runAction({ type: "toggle-menu" });
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
  const { term, searchResults } = useSearchState();

  const gainInputFocus = (e) => {
    runAction({ type: "set-input-focus", inputFocus: true });
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

  return h("div.searchbar-holder", { className }, [
    h("div.navbar-holder", [
      h(Navbar, { className: "searchbar panel" }, [
        h(InputGroup, {
          large: true,
          onChange: handleSearchInput,
          onClick: gainInputFocus,
          rightElement: h(MenuButton),
          placeholder: "Search Macrostrat...",
          value: term,
        }),
      ]),
    ]),
    h(SubtleFilterText),
  ]);
}

function SearchGuidance() {
  return h("div.search-guidance.bp3-text", [
    h("h3", ["Available categories"]),
    h("ul", [
      h("li", ["Time intervals"]),
      h("li", ["Lithologies"]),
      h("li", ["Stratigraphic Names"]),
      h("li", ["Environments (columns only)"]),
      h("li", ["Places"]),
    ]),
  ]);
}

export default Searchbar;
export { SearchResults };
