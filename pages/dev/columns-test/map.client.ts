import {
  ColumnNavigationMap,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useMapRef, useMapStyleOperator } from "@macrostrat/mapbox-react";
import mapboxgl from "mapbox-gl";

export function ColumnsMapContainer(props) {
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
            window.open(`/columns/${col}`, "_self");
          }
        },
        columnIDs,
      },
      h(FitBounds, { columnData })
    ),
  );
}

function FitBounds({ columnData }) {
  useMapStyleOperator((map) => {
    if (!map || columnData.length === 0) return;

    // Extract coordinates
    const coords = columnData
      .map(col => col.geometry.coordinates[0][0]);
    if (coords.length === 0) return;

    // Build bounds using the first coordinate
    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );

    map.fitBounds(bounds, {
      padding: 50,
      duration: 0,
    });
  });

  return null;
}
