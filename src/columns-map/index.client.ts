import { useEffect, useState } from "react";
import { MapAreaContainer, MapView } from "@macrostrat/map-interface";
import { SETTINGS } from "@macrostrat-web/settings";
import h from "./main.module.sass";
import mapboxgl from "mapbox-gl";

export function ColumnsMap({ columns }) {
  const [mapInstance, setMapInstance] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  const mapPosition = {
    camera: {
      lat: 39,
      lng: -98,
      altitude: 9000000,
    },
  };

  const handleMapLoaded = (map) => {
    setMapInstance(map);
    setMapBounds(map.getBounds());
  };

  useEffect(() => {
    if (!mapInstance || !columns || !columns.features?.length) return;

    addGeoJsonLayer(mapInstance, columns);
    fitMapToColumns(mapInstance, columns);
  }, [columns, mapInstance]);

  const fitMapToColumns = (map, columns) => {
    if (columns.features.length > 10) {
      map.fitBounds(mapBounds)
      return
    }

    const bounds = new mapboxgl.LngLatBounds();

    columns.features.forEach((feature) => {
      const coords =
        feature.geometry.type === "Point"
          ? [feature.geometry.coordinates]
          : feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0]
          : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates.flat(1)
          : [];

      coords.forEach(([lng, lat]) => {
        bounds.extend([lng, lat]);
      });
    });

    // Fit the map to these bounds
    map.fitBounds(bounds, {
      padding: {
        top: 20,
        bottom: 20,
        left: 200,
        right: 20,
      },
    });
  };

  const addGeoJsonLayer = (map, data) => {
    if (map.getLayer("highlight-layer")) {
      map.removeLayer("highlight-layer");
    }
    if (map.getLayer("geojson-layer")) {
      map.removeLayer("geojson-layer");
    }
    if (map.getSource("geojson-data")) {
      map.removeSource("geojson-data");
    }

    map.addSource("geojson-data", {
      type: "geojson",
      data,
    });

    if (!map.getLayer("highlight-layer")) {
      map.addLayer({
        id: "highlight-layer",
        type: "fill",
        source: "geojson-data",
        paint: {
          "fill-color": "#FFFFFF",
          "fill-opacity": 0.5,
        },
        filter: ["==", "col_id", ""],
      });
    }

    if (!map.getLayer("geojson-layer")) {
      map.addLayer({
        id: "geojson-layer",
        type: "fill",
        source: "geojson-data",
        paint: {
          "fill-color": "#FFFFFF",
          "fill-opacity": 0.2,
        },
      });

      map.on("click", "geojson-layer", (e) => {
        const feature = e.features?.[0];
        const col_id = feature?.properties?.col_id;
        if (col_id) {
          // TODO: fix this navigation
          window.open(`/columns/${col_id}`, "_blank");
        }
      });

      map.on("mousemove", "geojson-layer", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        const col_id = feature?.properties?.col_id;
        if (col_id) {
          map.setFilter("highlight-layer", ["==", "col_id", col_id]);
        }
      });

      map.on("mouseleave", "geojson-layer", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("highlight-layer", ["==", "col_id", ""]);
      });
    }
  };

  return h(
    "div.map-container",
    h(
      MapAreaContainer,
      {
        className: "map-area-container",
      },
      h(MapView, {
        style:
          "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true",
        mapboxToken: SETTINGS.mapboxAccessToken,
        mapPosition,
        onMapLoaded: handleMapLoaded,
      })
    )
  );
}
