import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { ColumnsMap } from "~/columns-map/index.client";
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
  projectID = null,
  className,
  columns = null,
}) {
  const columnData = useMacrostratColumns(projectID, projectID != null);

  let _columns = columns?.features ?? columnData;

  // Filter columns on the client side
  if (columnIDs != null) {
    _columns = _columns.filter((feature) =>
      columnIDs.includes(feature.properties.col_id)
    );
  }

  return h(
    "div",
    { className },
    h(ColumnsMap, {
      columns: { type: "FeatureCollection", features: _columns },
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
