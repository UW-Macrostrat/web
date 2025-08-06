import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ExpansionPanel } from "@macrostrat/map-interface";

export function ColumnsMapContainer(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, props));
}

export function ExpansionPanelContainer(props) {
  return h(ExpansionPanel, props);
}

function ColumnsMapInner({
  columnIDs = null,
  className,
  columns = null,
}) {
  columns = columns.features

  columns = columns.map((col) => {
    // Add a property to each column feature for the column ID
    col.id = col.properties.col_id;
    return col;
  });
  
  return h(
    "div",
    { className },
    h(ColumnNavigationMap, {
      columns,
      accessToken: mapboxAccessToken,
      style: {height: "100%"},
      onSelectColumn: (id) => {
        window.open(
          `/columns/${id}`,
          "_self"
        );
      }
    })
  );
}