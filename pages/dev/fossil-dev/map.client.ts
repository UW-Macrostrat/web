import {
  MapAreaContainer,
  MapView,
} from "@macrostrat/map-interface";
import h from "@macrostrat/hyper";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useMapRef, useMapStyleOperator } from "@macrostrat/mapbox-react";
import mapboxgl from "mapbox-gl";
import { darkMapURL } from "@macrostrat-web/settings";

export function MapContainer(props) {
  return h(ErrorBoundary, h(MapInner, props));
}

function MapInner({className}) {
  return h(
    MapAreaContainer,
    {
      className,
    },
    h(
      MapView,
      {
        style: darkMapURL,
      },
      []
    )
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
