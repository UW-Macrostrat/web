import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Card, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import "./main.scss";
import h from "@macrostrat/hyper";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { Loading, ColumnsMap } from "../index";

export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups } = useData();
  let columnGroupsNew;
  const columnRes = useAPIResult(SETTINGS.apiV2Prefix + "/columns?all")?.success?.data;
  const [columnInput, setColumnInput] = useState("");
  const shouldFilter = columnInput.length == 0 || columnInput.length >= 3;

  if(columnRes) {
    const grouped = {};

    for (const item of columnRes) {
      const key = item.col_group_id;

      if (!grouped[key]) {
        grouped[key] = {
          name: item.col_group,
          id: item.col_group_id,
          columns: []
        };
      }

      grouped[key].columns.push(item);
    }

    columnGroupsNew = Object.values(grouped);
    console.log("Old:", columnGroups);
    console.log("New:", columnGroupsNew);
  }

  const filteredGroups = shouldFilter ? columnGroups?.filter((group) => {
    const filteredColumns = group.columns.filter((col) => {
      const name = col.col_name.toLowerCase();
      const input = columnInput.toLowerCase();
      return name.includes(input);
    });

    if (filteredColumns.length > 0 || group.name.toLowerCase().includes(columnInput.toLowerCase())) {
      return { ...group, columns: filteredColumns }; 
    }

    return false; 
  }) : columnGroups;

  const colArr = filteredGroups
    ?.flatMap(item => 
      item.columns
        .filter(col => col.col_name.toLowerCase().includes(columnInput.toLowerCase()))
        .map(col => col.col_id)
    );

  const cols = shouldFilter ? "col_id=" + colArr?.join(',') : "all=1";

  const columnData = useAPIResult(SETTINGS.apiV2Prefix + "/columns?" + cols + "&response=long&format=geojson");    
  
  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  };

  if(!columnData || !columnRes) return h(Loading);

  const columnFeatures = columnData?.success?.data;

  console.log("Column Features:", columnFeatures);
  
  return h("div.column-list-page", [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h.if(columnFeatures)(ColumnsMap, { columns: columnFeatures}),
      h(Card, { className: "search-bar" }, [
        h(Icon, { icon: "search" }),
        h("input", {
          type: "text",
          placeholder: "Search columns...",
          onChange: handleInputChange,
        }),
      ]),
      h("div.column-groups",
        filteredGroups.map((d) =>
          h(ColumnGroup, { data: d, key: d.id, linkPrefix, columnInput, shouldFilter })
        )
      ),
    ]),
  ]);
}

function ColumnGroup({ data, linkPrefix, columnInput, shouldFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = shouldFilter ? data.columns.filter((col) => {
    const name = col.col_name.toLowerCase();
    const input = columnInput.toLowerCase();
    return name.includes(input);
  }) : data.columns;

  if (filteredColumns?.length === 0) return null;

  const { name } = data;
  return h('div', { className: 'column-group', onClick : () => setIsOpen(!isOpen) }, [
    h('div.column-group-header', [
      h("h2.column-group-name", name + " (Group #" + filteredColumns[0].col_group_id + ")"),
    ]),
    h(
      "div.column-list", [
        h(Divider),
        h('div.column-table', [
          h("div.column-row.column-header", [
            h("span.col-id", "Id"),
            h("span.col-name", "Name"),
            h("span.col-status", "Status"),
          ]),
          h(Divider),
          filteredColumns.map((data) =>
            h(ColumnItem, { data, linkPrefix })
          )
        ]),
    ])
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name, status } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("div.column-row", [
    h("span.col-id", "#" + col_id),
    h(Link, { className: 'col-link', href }, [col_name]),
    h("span", { className: status === "active" ? 'active' : status === 'obsolete' ? "obsolete" : 'inprocess'},  status ? UpperCase(status) : null),
  ]);
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

