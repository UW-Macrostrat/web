import { ContentPage } from "~/layouts";
import {
  Link,
  DevLinkButton,
  PageBreadcrumbs,
  StickyHeader,
} from "~/components";
import { AnchorButton, ButtonGroup, Card } from "@blueprintjs/core";
import { Tag } from "@macrostrat/data-components";
import { useState } from "react";
import h from "./main.module.sass";
import { useData } from "vike-react/useData";
import { ClientOnly } from "vike-react/ClientOnly";
import { navigate } from "vike/client/router";
import { SearchBar } from "../index";

export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnMapContainer(props) {
  return h(
    ClientOnly,
    {
      load: () => import("./map.client").then((d) => d.ColumnsMapContainer),
      fallback: h("div.loading", "Loading map..."),
      deps: [props.columnIDs, props.projectID],
    },
    (component) => h(component, props)
  );
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups, project } = useData();

  const [columnInput, setColumnInput] = useState("");
  const shouldFilter = columnInput.length >= 3;

  console.log("columnGroups", columnGroups);

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
              projectID: project?.project_id,
              className: "column-map-container",
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
        h(Link, { href: `/columns/groups/${data.id}`, target: "_blank" }, [
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

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name } = data;

  let nUnits = 0;
  try {
    nUnits = parseInt(data.t_units);
  } catch (e) {
    console.warn("Invalid number of units for column", col_id, data.t_units);
  }

  const unitsText = nUnits > 0 ? `${nUnits} units` : "empty";

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
      // Keep the semantic HTML structure for accessibility
      h("td.col-name", h("a", { href }, col_name)),
      h("td.col-status", [
        h.if(data.status == "in process")([
          h(
            Tag,
            { minimal: true, color: "lightgreen", size: "small" },
            "in process"
          ),
        ]),
        " ",
        h(
          Tag,
          {
            minimal: true,
            size: "small",
            color: nUnits == 0 ? "orange" : "dodgerblue",
          },
          unitsText
        ),
      ]),
    ]
  );
}
