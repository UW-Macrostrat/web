import hyper from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, Link, AttributedLithTag } from "~/components";
import {
  InputGroup,
  Spinner,
  Button,
  Collapse,
  Card,
  Switch,
} from "@blueprintjs/core";
import { InfiniteScroll } from "@macrostrat/ui-components";
import { useReducer, useEffect, useState } from "react";
import {
  FilterState,
  useDebouncedStratNames,
  defaultFilterState,
} from "./data-service";
import { setQueryString } from "@macrostrat/ui-components";
import styles from "./main.module.sass";
import { usePageProps } from "~/renderer/usePageProps";

const h = hyper.styled(styles);

function filterReducer(state: FilterState, action): FilterState {
  switch (action.type) {
    case "set-search-string":
      if (action.value === "") {
        action.value = null;
      }
      return { ...state, match: action.value };
    case "toggle-candidate-liths":
      return { ...state, candidates: state.candidates == null ? true : null };
  }
}

function compareQueryParams(a, b) {
  let newParams = {};
  for (let key in a) {
    if (a[key] !== b[key]) {
      newParams[key] = a[key];
    }
  }
  if (Object.keys(newParams).length === 0) {
    return null;
  }

  return newParams;
}

export function Page() {
  const { data, filters: startingFilters } = usePageProps();
  const [showSettings, setShowSettings] = useState(false);
  const [state, dispatch] = useReducer(filterReducer, startingFilters);

  useEffect(() => {
    let s1 = state;
    if (s1.match === "") {
      delete s1.match;
    }
    const q = compareQueryParams(s1, startingFilters);
    if (q != null) {
      setQueryString(s1);
    }
  }, [state]);

  return h(ContentPage, [
    h("div.page-header.stick-to-top", [
      h("div.flex.row.align-center", [
        h(PageHeader, { title: "Stratigraphic names" }),
        h("div.spacer"),
        h(FilterControl, {
          searchString: state.match,
          setSearchString(value) {
            dispatch({ type: "set-search-string", value });
          },
        }),
        h(Button, {
          icon: "settings",
          minimal: true,
          active: showSettings,
          onClick() {
            setShowSettings(!showSettings);
          },
        }),
      ]),
      h(SettingsPanel, { isOpen: showSettings, state, dispatch }),
    ]),
    h(StratNamesView, { initialData: data, filters: state }),
    h("div.background-placeholder"),
  ]);
}

function SettingsPanel({ isOpen = false, state, dispatch }) {
  return h(Collapse, { isOpen }, [
    h(Card, { elevation: 0 }, [
      h(Switch, {
        label: "Limit to units with candidate lithologies",
        checked: state.candidates != null,
        onChange() {
          dispatch({ type: "toggle-candidate-liths" });
        },
      }),
    ]),
  ]);
}

function FilterControl({ searchString, setSearchString }) {
  return h("div.filter-control", [
    h(InputGroup, {
      leftIcon: "filter",
      placeholder: "Filter",
      value: searchString,
      onChange(e) {
        setSearchString(e.target.value);
      },
    }),
  ]);
}

function StratNamesView({ initialData, filters }) {
  const [{ data, error, isLoading, hasMore }, loadNextPage] =
    useDebouncedStratNames(filters, { perPage: 20, delay: 300 }, initialData);

  return h(
    InfiniteScroll,
    {
      hasMore,
      loadMore() {
        loadNextPage();
      },
    },
    [
      h(StratNamesList, { data }),
      h.if(isLoading)(Spinner),
      h.if(!hasMore && !isLoading)("p", "No more data"),
    ]
  );
}

function StratNamesList({ data }) {
  if (data == null) {
    return null;
  }

  return h("div.strat-names-list", [
    data.map((d) => h(StratNameItem, { data: d, key: d.id })),
  ]);
}

const ranks = {
  Fm: "Formation",
  Mbr: "Member",
  Gp: "Group",
  Sgp: "Supergroup",
};

function StratNameItem({ data }) {
  const { kg_liths, liths, units, id } = data;
  return h("div.strat-name", {}, [
    h(
      Link,
      { href: `/lex/strat-names/${id}` },
      h("h2.strat-name", [
        data.strat_name,
        " ",
        h("span", ranks[data.rank] ?? data.rank),
      ])
    ),
    h("p", [`in ${units.length} columns`]),
    h("div.strat-name-details", [h(Liths, { liths })]),
    h.if(kg_liths != null)("div.strat-name-details", [
      h(Liths, { liths: kg_liths, candidate: true }),
    ]),
  ]);
}

function Liths({ liths, candidate = false }) {
  return h(
    "p.liths",
    liths.map((lith, i) => {
      return h(AttributedLithTag, { key: i, lith, candidate });
    })
  );
}
