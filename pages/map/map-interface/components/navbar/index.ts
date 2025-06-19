import { useCallback, useRef, useEffect } from "react";
import { Navbar, Button, InputGroup, Spinner, Card } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import {
  useAppActions,
  useAppState,
  useContextPanelOpen,
} from "../../app-state";
import { FilterPanel } from "../filter-panel";
import styles from "./navbar.module.sass";
import { MapLoadingButton, FloatingNavbar } from "@macrostrat/map-interface";
import { PanelSubhead } from "@macrostrat/map-interface";
import classNames from "classnames";
import { navigate } from "vike/client/router";
import { MacrostratIcon } from "~/components/macrostrat-icon";
import { useAdmoinshments } from "../filter-panel/admonishments";
import { MacrostatLogoLink } from "~/components/general";
import { useInDarkMode } from "@macrostrat/ui-components";

const h = hyper.styled(styles);

const categoryTitles = {
  lithology: "Lithologies",
  interval: "Time Intervals",
  place: "Places (via Mapbox)",
  strat_name: "Stratigraphic names",
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
      runAction({ type: "select-search-result", result: f });
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
  const searchResults = useAppState((s) => s.core.searchResults);
  className = classNames(className, "search-results-card");

  return h(Card, { className }, h(ResultList, { searchResults }));
}

function MenuButton() {
  const runAction = useAppActions();
  const menuOpen = useContextPanelOpen();

  const onClick = useCallback(() => {
    runAction({ type: "toggle-menu" });
  }, []);

  return h(MapLoadingButton, {
    icon: "menu",
    onClick,
    active: menuOpen,
  });
}

type AnyChildren = React.ReactNode | React.ReactFragment;

const filterPanelElement = h(FilterPanel);

function Searchbar({ className }) {
  const runAction = useAppActions();
  const term = useAppState((s) => s.core.term);
  const searchResults = useAppState((s) => s.core.searchResults);

  const gainInputFocus = useCallback(
    (e) => {
      runAction({ type: "set-input-focus", inputFocus: true });
    },
    [runAction]
  );

  const handleSearchInput = useCallback(
    (event) => {
      runAction({ type: "set-search-term", term: event.target.value });
      if (event.target.value.length <= 2) {
        return;
      }
      runAction({ type: "fetch-search-query", term: term });
    },
    [runAction]
  );

  useEffect(() => {
    if (term == "" && searchResults != null) {
      runAction({ type: "received-search-query", data: null });
    }
  }, [term]);

  const filters = useAppState((s) => s.core.filters);
  const admonishments = useAdmoinshments();

  let filterPanelElement = null;
  if (filters.length > 0 || admonishments.length > 0) {
    filterPanelElement = h(FilterPanel, { filters, admonishments });
  }

  return h(
    FloatingNavbar,
    { statusElement: filterPanelElement, className: "map-navbar" },
    [
      h("div.navbar-link-container", [
        h(MacrostatLogoLink, {
          logoStyle: "frameless-simple",
          className: "navbar-logo",
        }),
      ]),
      h(InputGroup, {
        large: true,
        onChange: handleSearchInput,
        onClick: gainInputFocus,
        rightElement: h(MenuButton),
        placeholder: "Search Macrostrat...",
        value: term,
      }),
    ]
  );
}

function SearchGuidance() {
  return h("div.search-guidance.bp5-text", [
    h("h3", ["Available categories"]),
    h("ul", [
      h("li", ["Time intervals"]),
      h("li", ["Lithologies"]),
      h("li", ["Stratigraphic names"]),
      h("li", ["Environments (columns only)"]),
      h("li", ["Places"]),
    ]),
  ]);
}

export default Searchbar;
export { SearchResults };
