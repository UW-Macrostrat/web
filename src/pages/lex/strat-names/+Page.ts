import hyper from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, Link } from "~/components";
import { AttributedLithTag } from "~/components";
import {
  InputGroup,
  Spinner,
  Button,
  Collapse,
  Card,
  Switch,
} from "@blueprintjs/core";
import { InfiniteScroll } from "@macrostrat/ui-components";
import { useReducer, useEffect, useState, useCallback } from "react";
import { fetchStratNames, FilterState } from "./data-service";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

function filterReducer(state: FilterState, action): FilterState {
  switch (action.type) {
    case "set-search-string":
      return { ...state, match: action.value };
    case "toggle-candidate-liths":
      return { ...state, candidates: !state.candidates };
  }
}

export function Page({ data, filters: startingFilters }) {
  const [showSettings, setShowSettings] = useState(false);
  const [state, dispatch] = useReducer(filterReducer, startingFilters);

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
        checked: state.candidates,
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

type StratNameViewState = {
  data: any[];
  isLoading: boolean;
  hasMore: boolean;
};

function infiniteScrollReducer(
  state: StratNameViewState,
  action
): StratNameViewState {
  switch (action.type) {
    case "set-loading":
      return { ...state, isLoading: true };
    case "reset":
      return { isLoading: true, data: [], hasMore: true };
    case "append":
      return {
        isLoading: false,
        data: [...state.data, ...action.data],
        hasMore: action.data.length > 0,
      };
    default:
      return state;
  }
}

function StratNamesView({ initialData, filters }) {
  const [state, dispatch] = useReducer(infiniteScrollReducer, {
    data: initialData,
    isLoading: false,
    hasMore: true,
  });

  useEffect(() => {
    console.log("Changed filters", filters);
    dispatch({ type: "reset" });
    // Wait to debounce query
    fetchStratNames(filters).then((data) => {
      dispatch({ type: "append", data });
    });
  }, [filters]);

  const { data, hasMore, isLoading } = state;
  return h(
    InfiniteScroll,
    {
      hasMore,
      loadMore() {
        dispatch({ type: "set-loading" });
        const lastId = data[data.length - 1]?.id ?? 0;
        fetchStratNames(filters, lastId).then((newData) => {
          dispatch({ type: "append", data: newData });
        });
      },
    },
    [h(StratNamesList, { data }), h.if(isLoading)(Spinner)]
  );
}

function StratNamesList({ data }) {
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
