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
import { useReducer, useState } from "react";
import { fetchStratNames } from "./data-service";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page({ data, filters }) {
  const [showSettings, setShowSettings] = useState(false);
  return h(ContentPage, [
    h("div.page-header.stick-to-top", [
      h("div.flex.row.align-center", [
        h(PageHeader, { title: "Stratigraphic names" }),
        h("div.spacer"),
        h(FilterControl, { filters }),
        h(Button, {
          icon: "settings",
          minimal: true,
          active: showSettings,
          onClick() {
            setShowSettings(!showSettings);
          },
        }),
      ]),
      h(SettingsPanel, { isOpen: showSettings }),
    ]),
    h(StratNamesView, { initialData: data }),
    h("div.background-placeholder"),
  ]);
}

function SettingsPanel({ isOpen = false }) {
  return h(Collapse, { isOpen }, [
    h(Card, { elevation: 0 }, [
      h(Switch, { label: "Limit to units with candidate lithologies" }),
    ]),
  ]);
}

function FilterControl({ filters }) {
  return h("div.filter-control", [
    h(InputGroup, { leftIcon: "filter", placeholder: "Filter" }),
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

function StratNamesView({ initialData }) {
  const [state, dispatch] = useReducer(infiniteScrollReducer, {
    data: initialData,
    isLoading: false,
    hasMore: true,
  });
  const { data, hasMore, isLoading } = state;
  return h(
    InfiniteScroll,
    {
      hasMore,
      loadMore() {
        dispatch({ type: "set-loading" });
        const lastId = data[data.length - 1].id;
        fetchStratNames({}, lastId).then((newData) => {
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
