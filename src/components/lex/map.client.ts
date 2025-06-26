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

  console.log("ColumnsMapInner", columns);
  
  return h(
    "div",
    { className },
    h(ColumnNavigationMap, {
      columns,
      accessToken: mapboxAccessToken,
      style: {height: "100%"},
      onSelectColumn: (e, data) => {
        console.log("Selected column:", data.properties.col_id);
      }
    })
  );
}

export function ColumnsMapOld({
  projectID,
  inProcess,
  className,
  selectedColumn,
  onSelectColumn,
}) {
  return h(
    ErrorBoundary,
    h(ColumnNavigationMap, {
      className,
      inProcess,
      projectID,
      accessToken: mapboxAccessToken,
      selectedColumn,
      onSelectColumn,
    })
  );
}
