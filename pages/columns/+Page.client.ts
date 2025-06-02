import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Card, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import h from "./main.module.scss";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { Loading, ColumnsMap } from "../index";
import { LinkCard } from "~/components/cards";
import { PostgrestPage } from "../PostgrestPage";


export function Page() {
    return h(PostgrestPage, {
        table: "cols_with_groups",
        order_col: "id",
        order_col2: "col_group_long",
        order: "asc",
        filter_col: "col_name",
        pageSize: 20,
        ItemList,
        Header,
    });
}

function Header({ data }) {
  const colArr = data.map((d) => (d.id));
  const columnData = useAPIResult(
    SETTINGS.apiV2Prefix + "/columns?col_id=" + colArr?.join(",") + "&response=long&format=geojson"
  );
  const columnFeatures = columnData?.success?.data;

  console.log("Column features:", columnFeatures);

  return h(ColumnsMap, {
    columns: columnFeatures,
  })
}

function ItemList({ data }) {
  const groups = data.reduce((acc, item) => {
    const groupId = item.col_group_long || "Uncategorized"; // Default to "Uncategorized" if no group
    if (!acc[groupId]) {  
      acc[groupId] = [];
    }

    const alreadyExists = acc[groupId].some(existing => existing.id === item.id);
    if (!alreadyExists) {
      acc[groupId].push(item);
    }
    return acc;
  }, {});

  return Object.entries(groups).map(([groupId, items]) => ColumnGroup({ data: { col_group_long: groupId, cols: items } }));
}

function ColumnGroup({ data }) {
  const { col_group_long } = data;

  return h('div', { className: 'column-group'}, [
    h('div.column-group-header', [
      h("h2.column-group-name", col_group_long + " (Group #" + data.cols[0].col_group_id + ")"),
    ]),
    h(
      "div.column-list", [
        h(Divider),
        h('div.column-table', [
          h("div.column-row.column-header", [
            h("span.col-id", "Id"),
            h("span.col-name", "Name"),
          ]),
          h(Divider),
          data.cols.map((data) =>
            h(ColumnItem, { data })
          )
        ]),
    ])
  ]);
}

function ColumnItem({ data}) {
  const { id, col_name } = data;
  const href = `/columns/${id}`;
  return h("div.column-row", [
    h("span.col-id", "#" + id),
    h(Link, { className: 'col-link', href }, col_name),
  ]);
}