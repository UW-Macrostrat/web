import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import React, { useState, useEffect, useRef, useMemo } from "react";

import { ContentPage } from "~/layouts";
import { Link, DevLinkButton, PageBreadcrumbs } from "~/components";
import { FlexRow, LithologyTag } from "~/components/lex/tag";
import { Footer, SearchBar } from "~/components/general";
import { getGroupedColumns } from "./grouped-cols";

import { AnchorButton, ButtonGroup, Switch, Popover } from "@blueprintjs/core";
import { Tag, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { ClientOnly } from "vike-react/ClientOnly";
import { navigate } from "vike/client/router";

import { postgrestPrefix } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { atom, useAtomValue, useSetAtom } from "jotai";

const h = hyper.styled(styles);

function ColumnMapContainer(props) {
  return h(
    ClientOnly,
    {
      load: () => import("./map.client").then((d) => d.ColumnsMapContainer),
      fallback: h("div.loading", "Loading map..."),
      deps: [props.columnIDs, props.projectID, props.hideColumns],
    },
    (component) => h(component, props)
  );
}

type ColumnFilterKey = "liths" | "stratNames" | "intervals";
type ColumnFilterState = Record<ColumnFilterKey, number[] | null | undefined>;

const columnFilterAtom = atom<ColumnFilterState | null>();

const addFilterAtom = atom(
  null,
  (_, set, type: ColumnFilterKey, identifier: number) => {
    set(columnFilterAtom, (value) => {
      const existing = value?.[type] ?? [];
      const newSet = new Set(existing);
      newSet.add(identifier);
      const updated = value || ({} as ColumnFilterState);
      updated[type] = Array.from(newSet);
      return updated;
    });
  }
);

function buildParamsFromFilters(
  filters: ColumnFilterState | null
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters == null) return params;
  for (const key of Object.keys(filters) as ColumnFilterKey[]) {
    const ids = filters[key];
    if (ids != null && ids.length > 0) {
      params[key] = `cs.[${ids.join(",")}]`;
    }
  }
  return params;
}

export function Page({ title = "Columns", linkPrefix = "/" }) {
  const { allColumnGroups, project } = useData();

  const filters = useAtomValue(columnFilterAtom);

  const [columnGroups, setColumnGroups] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extraParams, setExtraParams] = useState({});

  const [columnInput, setColumnInput] = useState("");
  const [showEmpty, setShowEmpty] = useState(true);
  const [filteredInput, setFilteredInput] = useState("");
  const [showInProcess, setShowInProcess] = useState(true);

  const isEmpty = Object.keys(extraParams).length === 0;
  const filteredGroups = isEmpty ? allColumnGroups : columnGroups ?? [];

  const hasSelectedItems = buildFilters(filters).length > 0;

  useEffect(() => {
    const params: any = buildParamsFromFilters(filters);

    if (filteredInput.length >= 3) {
      params.name = `ilike.%${filteredInput}%`;
    }
    if (!showEmpty) {
      params.empty = `is.false`;
    }
    if (!showInProcess) {
      params.status_code = "eq.active";
    }

    setExtraParams(params);
  }, [filters, filteredInput, showEmpty, showInProcess]);

  // set filtered input
  useEffect(() => {
    const prevLength = prevInputLengthRef.current;

    if (columnInput.length >= 3) {
      setFilteredInput(columnInput);
    } else if (prevLength >= 3 && columnInput.length === 2) {
      setFilteredInput("");
    }

    prevInputLengthRef.current = columnInput.length;
  }, [columnInput, showEmpty, showInProcess]);

  const prevInputLengthRef = useRef(columnInput.length);

  useEffect(() => {
    if (!isEmpty) {
      setLoading(true);
      getGroupedColumns(project?.project_id, extraParams)
        .then((groups) => setColumnGroups(groups))
        .finally(() => setLoading(false));
    }
  }, [project?.project_id, extraParams]);

  const columnIDs = useMemo(() => {
    return filteredGroups?.flatMap((item) =>
      item.columns.map((col) => col.col_id)
    );
  }, [filteredGroups]);

  const handleInputChange = (value, target) => {
    setColumnInput(value.toLowerCase());
  };

  const addFilter = useSetAtom(addFilterAtom);

  const handleLexClick = (data: { type: string; lex_id: number }) => {
    const filterKey = filterKeyFromType(data.type);
    addFilter(filterKey, data.lex_id);
    setColumnInput("");
    setFilteredInput("");
  };

  function LexCard({ data }) {
    return h(
      FlexRow,
      {
        alignItems: "center",
        width: "fit-content",
        gap: ".5em",
        className: "lith-tag",
        onClick: () => handleLexClick(data),
      },
      [
        h(LithologyTag, { data: { name: data.name, color: data.color } }),
        h("p.label", data.type),
      ]
    );
  }

  const res = useAPIResult(
    postgrestPrefix + "/col_filter?name=ilike.*" + filteredInput + "*"
  );

  const suggestData = res?.slice(0, 5);

  return h("div.column-list-page", [
    h(ContentPage, [
      h("div.flex-row", [
        h("div.main", [
          h("div", [
            h(PageBreadcrumbs, { showLogo: true }),
            h("div.filters", [
              h(SearchBar, {
                placeholder: "Search columns...",
                onChange: handleInputChange,
                className: "search-bar",
                value: columnInput,
              }),
              h(
                Popover,
                {
                  content: h.if(!hasSelectedItems && suggestData?.length > 0)(
                    "div.suggested-items",
                    suggestData?.map((item) => h(LexCard, { data: item }))
                  ),
                  isOpen: filteredInput.length >= 3,
                  position: "right",
                },
                h("div")
              ),
              h("div.switches", [
                h(Switch, {
                  checked: showEmpty,
                  label: "Show empty",
                  onChange: () => setShowEmpty(!showEmpty),
                }),
                h(Switch, {
                  checked: showInProcess,
                  label: "Show in process",
                  onChange: () => setShowInProcess(!showInProcess),
                }),
              ]),
            ]),
            h(LexFilters),
          ]),
          h.if(!loading)(
            "div.column-groups",
            filteredGroups?.map((d) =>
              h(ColumnGroup, {
                data: d,
                key: d.id,
                linkPrefix,
                showEmpty,
              })
            )
          ),
          h.if(columnGroups?.length == 0 && !loading)(
            "div.empty",
            "No columns found"
          ),
          h.if(loading)("div.loading", "Loading columns..."),
        ]),
        h("div.sidebar", [
          h("div.sidebar-content", [
            h(ButtonGroup, { vertical: true, large: true }, [
              h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
              h(
                DevLinkButton,
                { href: "/columns/correlation" },
                "Correlation chart"
              ),
            ]),
            h(ColumnMapContainer, {
              columnIDs,
              projectID: project?.project_id,
              className: "column-map-container",
            }),
          ]),
        ]),
      ]),
    ]),
    h(Footer),
  ]);
}

function ColumnGroup({ data, linkPrefix }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = data.columns;

  if (filteredColumns?.length === 0) return null;

  const { name } = data;
  return h(
    "div",
    { className: "column-group", onClick: () => setIsOpen(!isOpen) },
    [
      h("div.column-group-header", [
        h(Link, { href: `/columns/groups/${data.id}`, target: "_self" }, [
          h(
            "h2.column-group-name",
            name + " (Group #" + filteredColumns[0].col_group_id + ")"
          ),
        ]),
      ]),
      h("div.column-list", [
        h("table.column-table", [
          h("thead.column-row.column-header", [
            h("tr", [
              h("th.col-id", "ID"),
              h("th.col-name", "Name"),
              h("th.col-status", "Status"),
            ]),
          ]),
          h("tbody", [
            filteredColumns.map((data) => h(ColumnItem, { data, linkPrefix })),
          ]),
        ]),
      ]),
    ]
  );
}

const ColumnItem = React.memo(
  function ColumnItem({ data, linkPrefix = "/" }) {
    const { col_id, name, units } = data;

    const unitsText = units?.length > 0 ? `${units?.length} units` : "empty";

    const href = linkPrefix + `columns/${col_id}`;
    return h(
      "tr.column-row",
      {
        onClick() {
          navigate(href);
        },
      },
      [
        h("td.col-id", h("code.bp5-code", col_id)),
        h("td.col-name", h("a", { href }, name)),
        h("td.col-status", [
          data.status_code === "in process" &&
            h(
              Tag,
              { minimal: true, color: "lightgreen", size: "small" },
              "in process"
            ),
          " ",
          h(
            Tag,
            {
              minimal: true,
              size: "small",
              color: units?.length === 0 ? "orange" : "dodgerblue",
            },
            unitsText
          ),
        ]),
      ]
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.data.col_id === nextProps.data.col_id &&
      prevProps.data.col_name === nextProps.data.col_name &&
      prevProps.data.status === nextProps.data.status &&
      prevProps.data.t_units === nextProps.data.t_units &&
      prevProps.linkPrefix === nextProps.linkPrefix
    );
  }
);

function LexFilters() {
  const filterState = useAtomValue(columnFilterAtom);
  const filters = buildFilters(filterState);
  if (filters.length == 0) return null;
  return h("div.lex-filters", [
    h(
      FlexRow,
      {
        align: "center",
        gap: ".5em",
      },
      [
        h("p.filter", "Filtering columns by "),
        ...filters.map((filter) =>
          h(ColumnFilterItem, {
            data: {
              type: typeFromFilterKey(filter.type),
              lex_id: filter.identifier,
            },
            key: filter.type + filter.identifier,
          })
        ),
      ]
    ),
  ]);
}

const clearAllFiltersAtom = atom(null, (get, set) => {
  set(columnFilterAtom, null);
});

interface ColumnFilterDefinition {
  type: ColumnFilterKey;
  identifier: number;
}

function buildFilters(
  filters: ColumnFilterState | null
): ColumnFilterDefinition[] {
  const filterItems: ColumnFilterDefinition[] = [];
  if (filters == null) return filterItems;
  for (const key of Object.keys(filters) as ColumnFilterKey[]) {
    const ids = filters[key];
    if (ids != null) {
      for (const id of ids) {
        filterItems.push({ type: key, identifier: id });
      }
    }
  }
  return filterItems;
}

function ColumnFilterItem({ data }: { data: ColumnFilterDefinition }) {
  const { type, identifier } = data;
  const route = routeForFilterKey(type);
  const clearAllFilters = useSetAtom(clearAllFiltersAtom);
  return h("div.lex-filter-item", [
    h(LithologyTag, {
      href: `/lex/${route}/${identifier}`,
      data: { lex_id: identifier, type: type },
    }),
    h(Icon, {
      className: "close-btn",
      icon: "cross",
      onClick: clearAllFilters,
    }),
  ]);
}

function routeForFilterKey(key: ColumnFilterKey): string {
  switch (key) {
    case "liths":
      return "lithologies";
    case "stratNames":
      return "strat-names";
    case "intervals":
      return "intervals";
  }
}

function filterKeyFromType(type: string): ColumnFilterKey | null {
  switch (type) {
    case "lithology":
      return "liths";
    case "strat name":
      return "stratNames";
    case "interval":
      return "intervals";
    default:
      return null;
  }
}

function typeFromFilterKey(key: ColumnFilterKey): string {
  switch (key) {
    case "liths":
      return "lithology";
    case "stratNames":
      return "strat name";
    case "intervals":
      return "interval";
  }
}
