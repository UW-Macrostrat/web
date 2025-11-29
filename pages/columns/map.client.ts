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
import { navigate as vikeNavigate } from "vike/client/router";

export function ColumnMapContainer(props: {
  columnIDs?: number[] | null;
  projectID?: number | null;
}) {
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
          console.log(col, projectID);
          if (col == null) return;
          let url = `/columns/${col}`;
          if (projectID != null) {
            url = `/projects/${projectID}` + url;
          }
          vikeNavigate(url);
        },
        columns: columnData,
        projectID,
      },
      h(FitBounds, { columnData })
    )
  );
}

function FitBounds({ columnData }) {
  useMapStyleOperator(
    (map) => {
      if (!map || columnData.length === 0) return;

      console.log(columnData);

      // Extract coordinates
      const coords = columnData
        .map(getRepresentativeCoordinate)
        .filter(Boolean);
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
    },
    [columnData]
  );

  return null;
}
function getRepresentativeCoordinate(column) {
  const geom = column.geometry;
  if (geom.type === "Point") {
    return geom.coordinates;
  }
  if (geom.type === "Polygon") {
    return geom.coordinates[0][0];
  }
  return null;
}
