import React, { useState } from "react";
import { ContentPage } from "~/layouts";
import {
  Link,
  DevLinkButton,
  PageBreadcrumbs,
  StickyHeader,
} from "~/components";
import { AnchorButton, ButtonGroup } from "@blueprintjs/core";
import { Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

import { useData } from "vike-react/useData";
import { ClientOnly } from "vike-react/ClientOnly";
import { navigate } from "vike/client/router";
import { SearchBar } from "~/components/general";
import { fetchAPIData, fetchPGData } from "~/_utils";
import { Units } from "~/components/lex";

const h = hyper.styled(styles);

export function Page(props) {
  return h(ColumnListPage, props);
}

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

async function getGroupedColumns(project_id: number | null, params?: any) {
  let columnURL = "/col_data";
  if (project_id == null) {
    // The 'columns' route gives all columns in active projects
  } else {
    // Only get columns for a specific project
    params = { project_id };
  }

  const [columns, groups] = await Promise.all([
    fetchPGData(columnURL, params),
    fetchAPIData(`/defs/groups`, { ...params, all: true}),
  ]);

  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group
  // Create a map of column groups
  const groupMap = new Map<number, ColumnGroup>(
    groups.map((g) => [
      g.col_group_id,
      { name: g.name, id: g.col_group_id, columns: [] },
    ])
  );
  groupMap.set(-1, {
    id: -1,
    name: "Ungrouped",
    columns: [],
  });

  for (const col of columns) {
    const col_group_id = col.col_group_id ?? -1;
    const group = groupMap.get(col_group_id);
    group.columns.push(col);
  }

  const groupsArray = Array.from(groupMap.values()).filter(
    (g) => g.columns.length > 0
  );

  // Sort the groups by id
  groupsArray.sort((a, b) => {
    if (a.id === -1) return 1; // Ungrouped should come last
    return a.id - b.id;
  });

  return groupsArray;
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  // const { columnGroups, project } = useData();
  const [columnGroups, setColumnGroups] = useState(null);
  const [extraParams, setExtraParams] = useState({});

  getGroupedColumns(null, extraParams)
    .then((columnGroups) => setColumnGroups(columnGroups));

  const [columnInput, setColumnInput] = useState("");
  const shouldFilter = columnInput.length >= 3;

  const filteredGroups = shouldFilter
    ? columnGroups?.filter((group) => {
        const filteredColumns = group.columns.filter((col) => {
          const name = col.col_name.toLowerCase();
          const input = columnInput.toLowerCase();
          return name.includes(input);
        });

        if (
          filteredColumns.length > 0 ||
          group.name.toLowerCase().includes(columnInput.toLowerCase())
        ) {
          return { ...group, columns: filteredColumns };
        }

        return false;
      })
    : null;

  const columnIDs = filteredGroups?.flatMap((item) =>
    item.columns
      .filter((col) =>
        col.col_name.toLowerCase().includes(columnInput.toLowerCase())
      )
      .map((col) => col.col_id)
  );

  const hideColumns = columnIDs?.length === 0 && columnInput.length >= 3;

  const handleInputChange = (value, target) => {
    setColumnInput(value.toLowerCase());
  };

  const allGroups = filteredGroups ?? columnGroups ?? [];

  return h("div.column-list-page", [
    h(ContentPage, [
      h("div.flex-row", [
        h("div.main", [
          h(StickyHeader, [
            h(PageBreadcrumbs, { showLogo: true }),
            h(SearchBar, {
              placeholder: "Search columns...",
              onChange: handleInputChange,
            }),
          ]),
          h(
            "div.column-groups",
            allGroups.map((d) =>
              h(ColumnGroup, {
                data: d,
                key: d.id,
                linkPrefix,
                columnInput,
                shouldFilter,
              })
            )
          ),
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
              projectID: null, // Fix
              className: "column-map-container",
              hideColumns,
            }),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function ColumnGroup({ data, linkPrefix, columnInput, shouldFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = shouldFilter
    ? data.columns.filter((col) => {
        const name = col.col_name.toLowerCase();
        const input = columnInput.toLowerCase();
        return name.includes(input);
      })
    : data.columns;

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
