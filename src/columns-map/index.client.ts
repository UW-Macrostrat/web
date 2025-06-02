import { useEffect, useState } from "react";
import { MapAreaContainer, MapView } from "@macrostrat/map-interface";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import { navigate } from "vike/client/router";

export function ColumnsMap({ columns }) {
  const [mapInstance, setMapInstance] = useState(null);

  const mapPosition = {
    camera: {
      lat: 39,
      lng: -98,
      altitude: 9000000,
    },
  };

  const handleMapLoaded = (map) => {
    setMapInstance(map);
  };

  useEffect(() => {
    if (!mapInstance || !columns || !columns.features?.length) return;

    addGeoJsonLayer(mapInstance, columns);
    fitMapToColumns(mapInstance, columns);
  }, [columns, mapInstance]);

  const fitMapToColumns = (map, columns) => {
    if (columns.features.length > 10) return;

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
        left: 20,
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
          navigate(`/columns/${col_id}`);
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
    MapAreaContainer,
    { fitViewport: false },
    h(MapView, {
      style:
        "mapbox://styles/jczaplewski/cl5uoqzzq003614o6url9ou9z?optimize=true",
      mapboxToken: mapboxAccessToken,
      mapPosition,
      onMapLoaded: handleMapLoaded,
    })
  );
}
