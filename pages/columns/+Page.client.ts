import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Tag, Card, Collapse, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import "./main.scss";
import h from "@macrostrat/hyper";
import {
  MapAreaContainer,
  MapMarker,
  MapView,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { SETTINGS } from "@macrostrat-web/settings";
import mapboxgl, { LngLat } from "mapbox-gl";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useEffect, useCallback } from "react";
import { onDemand } from "~/_utils";
import { navigate } from "vike/client/router";
import { useMapRef } from "@macrostrat/mapbox-react";
import { ColumnMap } from "../index";
import { useAPIResult } from "@macrostrat/ui-components";
import { Loading, ColumnsMap } from "../index";

export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups } = useData();
  // const columnData = useAPIResult(SETTINGS.apiV2Prefix + "/columns&all");
  const [columnInput, setColumnInput] = useState("");

const filteredGroups = columnGroups.filter((group) => {
    // Filter the columns of the group based on the input
    const filteredColumns = group.columns.filter((col) => {
      const name = col.col_name.toLowerCase();
      const input = columnInput.toLowerCase();
      return name.includes(input);
    });

    // If any columns match the input, include the group (with the filtered columns)
    if (filteredColumns.length > 0 || group.name.toLowerCase().includes(columnInput.toLowerCase())) {
      return { ...group, columns: filteredColumns }; // Return the group with filtered columns
    }

    return false; // Exclude this group if no matching columns or group name
  });

  const colArr = filteredGroups
    .flatMap(item => 
      item.columns
        .filter(col => col.col_name.toLowerCase().includes(columnInput.toLowerCase()))
        .map(col => col.col_id)
    );

  const columnData = useAPIResult(SETTINGS.apiV2Prefix + "/columns?col_id=" + colArr.join(',') + "&response=long&format=geojson");    

  const handleInputChange = (event) => {
    setColumnInput(event.target.value.toLowerCase());
  };

  if(!columnData) return h(Loading);

  const columnFeatures = columnData?.success?.data;
  
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
          h(ColumnGroup, { data: d, key: d.id, linkPrefix, columnInput })
        )
      ),
    ]),
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
    h("span", { className: status === "active" ? 'active' : status === 'obsolete' ? "obsolete" : 'inprocess'},  UpperCase(status)),
  ]);
}

function UpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

