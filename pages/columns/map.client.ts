import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { hideColumn } from "#/maps/ingestion/@id/reducer";

export function ColumnsMapContainer(props) {
  /* TODO: integrate this with shared web components */
  return h(ErrorBoundary, h(ColumnsMapInner, props));
}

function ColumnsMapInner({ columnIDs = null, projectID = null, className, hideColumns }) {
  const columnData = useMacrostratColumns(projectID, projectID != null);

  if(!columnData) {
    return h("div", { className }, "Loading map...");
  }

  const params = { 
    style: { height: "100%" },
    accessToken: mapboxAccessToken,
    onSelectColumn: (col) => {
      if (col) {
        window.open(`/columns/${col}`, "_blank");
      }
    }
  }

  console.log("hidecolumns", hideColumns);

  if(!hideColumns) {
    params.columns = columnData;
    params.columnIDs = columnIDs;
  } else {
    params.columns = [];
  }
  return h(
    "div",
    { className },
    h(ColumnNavigationMap, params),
  );
}