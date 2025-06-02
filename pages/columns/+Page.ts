import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Card, Icon } from "@blueprintjs/core";
import { useState } from "react";
import h from "./main.module.scss";
import { useData } from "vike-react/useData";
import { ClientOnly } from "vike-react/ClientOnly";

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

  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  };

  const allGroups = filteredGroups ?? columnGroups ?? [];

  return h("div.column-list-page", [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
      h(ColumnMapContainer, { columnIDs, projectID: project?.project_id }),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h(Card, { className: "search-bar" }, [
        h(Icon, { icon: "search" }),
        h("input", {
          type: "text",
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
        h(
          "h2.column-group-name",
          name + " (Group #" + filteredColumns[0].col_group_id + ")"
        ),
      ]),
      h("div.column-list", [
        h(Divider),
        h("div.column-table", [
          h("div.column-row.column-header", [
            h("span.col-id", "Id"),
            h("span.col-name", "Name"),
          ]),
          h(Divider),
          filteredColumns.map((data) => h(ColumnItem, { data, linkPrefix })),
        ]),
      ]),
    ]
  );
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name, status } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("div.column-row", [
    h("span.col-id", "#" + col_id),
    h(Link, { className: "col-link", href }, [col_name]),
  ]);
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
