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

  return h(
    "div",
    { className },
    h(ColumnNavigationMap, 
      { 
        style: { height: "100%" },
        accessToken: mapboxAccessToken,
        onSelectColumn: (col) => {
          if (col) {
            window.open(`/columns/${col}`, "_blank");
          }
        },
        columnIDs,
        columns: hideColumns ? [] : columnData,
        mapPosition: {
          camera: {
            lat: 39, 
            lng: -98, 
            altitude: 10000000,
          },
        }
      }
    ),
  );
}