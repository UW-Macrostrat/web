import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { getGroupedColumns } from "./grouped-cols";
import { FlexRow } from "@macrostrat/ui-components";
import { Switch } from "@blueprintjs/core";

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

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { allColumnGroups, project } = useData();
  
  const [columnGroups, setColumnGroups] = useState(null);
  const [extraParams, setExtraParams] = useState({});

  const [columnInput, setColumnInput] = useState("");
  const [showEmpty, setShowEmpty] = useState(true);
  const [filteredInput, setFilteredInput] = useState("");

  const [showInProcess, setShowInProcess] = useState(true);
  const shouldFilter = columnInput.length >= 3;

  const isEmpty = Object.keys(extraParams).length === 0;
  const filteredGroups = isEmpty ? allColumnGroups : columnGroups ?? [];

  useEffect(() => {
    const params: any = {};

    if (filteredInput.length >= 3) {
      params.name = `ilike.%${filteredInput}%`;
    }
    if (!showEmpty) {
      params.empty = `is.false`;
    }
    if (!showInProcess) {
      params.status_code = 'eq.active';
    }

    setExtraParams(params);
  }, [filteredInput, showEmpty, showInProcess]);


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
    getGroupedColumns(null, extraParams)
      .then((groups) => setColumnGroups(groups));
  }, [extraParams]);

  const columnIDs = useMemo(() => {
    return filteredGroups?.flatMap((item) =>
      item.columns.map((col) => col.col_id)
    );
  }, [filteredGroups]);

  if(!columnGroups) {
    console.log('filteredGroups:', filteredGroups);
    return h("div.loading", "Loading columns...");
  }

  const handleInputChange = (value, target) => {
    setColumnInput(value.toLowerCase());
  };

  return h("div.column-list-page", [
    h(ContentPage, [
      h("div.flex-row", [
        h("div.main", [
          h(StickyHeader, [
            h(PageBreadcrumbs, { showLogo: true }),
              h(FlexRow, { gap: "1em", alignItems: "center"}, [
                h(SearchBar, {
                  placeholder: "Search columns...",
                  onChange: handleInputChange,
                  className: "search-bar",
                }),
                h('div.switches', [
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
                ])
              ])
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
            }),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function ColumnGroup({ data, linkPrefix }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredColumns = data.columns

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
