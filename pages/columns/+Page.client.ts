import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Card, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import h from "./main.module.scss";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { Loading } from "../index";
import { ColumnsMap } from "~/columns-map/index.client";

export function Page(props) {
  const columnRes = useAPIResult(SETTINGS.apiV2Prefix + "/columns?all")?.success
    ?.data;
  return h(ColumnListPage, { ...props, columnRes });
}

export function ColumnListPage({ title = "Columns", linkPrefix = "/", columnRes, project = null }) {
  let columnGroups;
  const [columnInput, setColumnInput] = useState("");
  const shouldFilter = columnInput.length >= 3;

  if (columnRes) {
    const grouped = {};

    for (const item of columnRes) {
      const key = item.col_group_id;

      if (!grouped[key]) {
        grouped[key] = {
          name: item.col_group,
          id: item.col_group_id,
          columns: [],
        };
      }

      grouped[key].columns.push(item);
    }

    columnGroups = Object.values(grouped);
  }

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
    : columnGroups;

  const colArr = filteredGroups?.flatMap((item) =>
    item.columns
      .filter((col) =>
        col.col_name.toLowerCase().includes(columnInput.toLowerCase())
      )
      .map((col) => col.col_id)
  );

  let cols;
  if (project) {
    cols = shouldFilter
      ? "col_id=" + colArr?.join(",")
      : "project_id=" + project.project_id;
  } else {
    cols = shouldFilter ? "col_id=" + colArr?.join(",") : "all";
  }

  const columnData = useAPIResult(
    SETTINGS.apiV2Prefix + "/columns?" + cols + "&response=long&format=geojson"
  );

  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  };

  if (!columnData || !columnRes) return h(Loading);

  const columnFeatures = columnData?.success?.data;

  return h("div.column-list-page", [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h.if(columnFeatures)(ColumnsMap, { columns: columnFeatures, project }),
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
        filteredGroups.map((d) =>
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
