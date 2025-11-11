import {
  ColumnNavigationMap,
  MacrostratDataProvider,
  useMacrostratColumns,
} from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { apiV2Prefix, mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useMapStyleOperator } from "@macrostrat/mapbox-react";
import mapboxgl from "mapbox-gl";

export function ColumnMapContainer(props) {
  return h(
    ErrorBoundary,
    h(
      MacrostratDataProvider,
      { baseURL: apiV2Prefix },
      h(ColumnsMapInner, props)
    )
  );
}

function ColumnsMapInner({
  columnIDs = null,
  projectID = null,
  className,
  inProcess = false,
}) {
  const columnBaseData = useMacrostratColumns(projectID, inProcess) ?? [];

  const columnData = columnBaseData.filter((col) =>
    columnIDs?.includes(col.id)
  );

  return h(
    "div",
    { className },
    h(
      ColumnNavigationMap,
      {
        style: { height: "100%" },
        accessToken: mapboxAccessToken,
        onSelectColumn: (col) => {
          if (col) {
            window.open(`/columns/${col}`, "_self");
          }
        },
        columns: columnData,
        projectID,
      },
      h(FitBounds, { columnData })
    )
  );
}

function FitBounds({ columnData }) {
  useMapStyleOperator((map) => {
    if (!map || columnData.length === 0) return;

    // Extract coordinates
    const coords = columnData.map((col) => col.geometry.coordinates[0][0]);
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
  }, [columnData]);

  return null;
}
