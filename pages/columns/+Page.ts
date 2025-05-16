import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Tag, Card, Collapse, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import h from "./main.module.scss";
import { log } from "console";

export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups } = useData();

  console.log("columnGroups", columnGroups);

  const [columnInput, setColumnInput] = useState("");
  const filteredGroups = columnGroups.filter((group) => {
    const name = group.name.toLowerCase();
    const columns = group.columns.map((col) => col.col_name.toLowerCase());
    const input = columnInput.toLowerCase();
    return name.includes(input) || columns.some((col) => col.includes(input));
  });

  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  }
  
  return h('div.column-list-page', [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(Card, [
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search columns",
            onChange: handleInputChange 
          }),
        ])
      ]),      
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h('div.column-groups', 
        filteredGroups.map((d) => h(ColumnGroup, { data: d, key: d.id, linkPrefix, columnInput }) ),
      )
    ])
  ]);
}

function ColumnGroup({ data, linkPrefix, columnInput }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = data.columns.filter((col) => {
    const name = col.col_name.toLowerCase();
    const input = columnInput.toLowerCase();
    return name.includes(input);
  });

  if (filteredColumns?.length === 0) return null;

  const { id, name, columns } = data;
  return h(Card, { className: 'column-group', onClick : () => setIsOpen(!isOpen) }, [
    h('div.column-group-header', [
      h("h2.column-group-name", name),
      h(Icon, { 
        icon: isOpen ? "chevron-up" : "chevron-down",
      }),
    ]),
    h(Collapse, { isOpen }, 
      h(
        "div.column-list", [
          h(Divider),
          h('div.column-table', [
            h("div.column-row.column-header", [
              h("span.col-id", "Id"),
              h("span.col-name", "Name"),
              h("span.col-status", "Status"),
              h("span.col-status", "Group"),
            ]),
            h(Divider),
            filteredColumns.map((data) =>
              h(ColumnItem, { data, key: data.col_id, linkPrefix })
            )
          ]),
      ])
    ),
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name, status, col_group_id } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("div.column-row", [
    h("span.col-id", "#" + col_id),
    h(Link, { className: 'col-link', href }, [col_name]),
    h("span", { className: status === "active" ? 'active' : 'inprocess'},  UpperCase(status)),
    h("span.col-group", "#" + col_group_id),
  ]);
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}