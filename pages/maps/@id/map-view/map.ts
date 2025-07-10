import { getPBDBData } from "./filter-helpers";
import {
  AppAction,
  MapLayer,
  useAppActions,
} from "#/map/map-interface/app-state";
import { ColumnProperties } from "#/map/map-interface/app-state/handlers/columns";
import {
  useMapRef,
  useMapStatus,
  useMapStyleOperator,
} from "@macrostrat/mapbox-react";
import { useEffect, useRef, useCallback } from "react";
import { useAppState } from "#/map/map-interface/app-state";
import { getExpressionForFilters } from "./filter-helpers";

interface MapProps {
  use3D: boolean;
  isDark: boolean;
  mapIsRotated: boolean;
  onQueryMap: (event: any, columns: ColumnProperties[]) => void;
  plateModelId: number;
  runAction: (action: any) => void;
}

type MapZoomAction = {
  type: "zoom-map";
  dz: number;
};

function handleFossilLayerClick(
  event,
  map,
  pbdbPoints
): AppAction | MapZoomAction | null {
  const mapZoom = map.getZoom();
  let collections = map.queryRenderedFeatures(event.point, {
    layers: ["pbdb-points-clustered", "pbdb-points", "pbdb-clusters"],
  });
  // Clicked on a hex grid
  if (
    collections.length &&
    collections[0].properties.hasOwnProperty("hex_id")
  ) {
    return { type: "zoom-map", dz: 1 };
    // Clicked on a summary cluster
  } else if (
    collections.length &&
    collections[0].properties.hasOwnProperty("oid") &&
    collections[0].properties.oid.split(":")[0] === "clu" &&
    mapZoom <= 12
  ) {
    return { type: "zoom-map", dz: 2 };
    // Clicked on a real cluster of collections

    // ... the way we do clustering here is kind of strange.
  } else if (
    collections.length &&
    (collections[0].properties.hasOwnProperty("cluster") ||
      // Summary cluster when zoom is too high
      collections[0].properties.oid.split(":")[0] === "clu")
  ) {
    // via https://jsfiddle.net/aznkw784/
    let pointsInCluster = pbdbPoints.features
      .filter((f) => {
        let pointPixels = map.project(f.geometry.coordinates);
        let pixelDistance = Math.sqrt(
          Math.pow(event.point.x - pointPixels.x, 2) +
            Math.pow(event.point.y - pointPixels.y, 2)
        );
        return Math.abs(pixelDistance) <= 50;
      })
      .map((f) => {
        return f.properties.oid.replace("col:", "");
      });

    // Need to recolor on selection somehow
    return {
      type: "get-pbdb",
      collection_nos: pointsInCluster,
    };

    // Clicked on an unclustered point
  } else if (
    collections.length &&
    collections[0].properties.hasOwnProperty("oid")
  ) {
    let collection_nos = collections.map((col) => {
      return col.properties.oid.replace("col:", "");
    });
    return { type: "get-pbdb", collection_nos };
    //    return
  }

  return null;
}

function handleCrossSectionClick(event, _crossSectionLine): AppAction | null {
  // If the elevation drawer is open and we are awaiting to points, add them
  let crossSectionLine = _crossSectionLine;
  let crossSectionCoords = crossSectionLine?.coordinates ?? [];
  if (
    (crossSectionLine != null && crossSectionCoords.length < 2) ||
    event.originalEvent.shiftKey
  ) {
    crossSectionLine ??= { type: "LineString", coordinates: [] };

    if (crossSectionCoords.length === 2) {
      // Resset cross sections
      crossSectionCoords = [];
    }
    crossSectionCoords.push([event.lngLat.lng, event.lngLat.lat]);
    return {
      type: "update-cross-section",
      line: {
        type: "LineString",
        coordinates: crossSectionCoords,
      },
    };
  }
  return null;
}

function useMapClickHandler(pbdbPoints) {
  const mapRef = useMapRef();
  const runAction = useAppActions();

  const crossSectionLine = useAppState((s) => s.core.crossSectionLine);
  const mapLayers = useAppState((s) => s.core.mapLayers);

  return useCallback(
    (event) => {
      const map = mapRef.current;

      const action = handleCrossSectionClick(event, crossSectionLine);
      if (action != null) {
        runAction(action);
        return;
      }

      // If we are viewing fossils, prioritize clicks on those
      if (mapLayers.has(MapLayer.FOSSILS)) {
        const action = handleFossilLayerClick(event, map, pbdbPoints.current);
        if (action != null) {
          if (action.type === "zoom-map") {
            map.zoomTo(map.getZoom() + action.dz, { center: event.lngLat });
          } else {
            runAction(action);
          }
          return;
        } else {
          // Otherwise make sure that old fossil collections aren't visible
          runAction({ type: "reset-pbdb" });
        }
      }

      // Otherwise try to query the geologic map
      let features = map.queryRenderedFeatures(event.point, {
        layers: ["burwell_fill", "column_fill", "filtered_column_fill"],
      });

      // TODO: re-enable this geologic map querying
      let burwellFeatures = features
        .filter((f) => {
          if (f.layer.id === "burwell_fill") return f;
        })
        .map((f) => {
          return f.properties;
        });

      const columns: ColumnProperties[] = features
        .filter((f) => {
          if (
            f.layer.id === "column_fill" ||
            f.layer.id === "filtered_column_fill"
          )
            return f;
        })
        .map((f) => {
          return f.properties;
        });

      runAction({
        type: "map-query",
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        z: map.getZoom(),
        columns,
        map_id: null,
      });
    },
    [mapRef.current, mapLayers, crossSectionLine]
  );
}

// PBDB hexgrids and points are refreshed on every map move
export async function refreshPBDB(map, pointsRef, filters) {
  let bounds = map.getBounds();
  let zoom = map.getZoom();
  const maxClusterZoom = 7;
  pointsRef.current = await getPBDBData(filters, bounds, zoom, maxClusterZoom);

  // Show or hide the proper PBDB layers
  // TODO: this is a bit janky
  if (zoom < maxClusterZoom) {
    map.getSource("pbdb-clusters").setData(pointsRef.current);
    map.setLayoutProperty("pbdb-clusters", "visibility", "visible");
    map.setLayoutProperty("pbdb-points-clustered", "visibility", "none");
    //  map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'none')
    map.setLayoutProperty("pbdb-points", "visibility", "none");
  } else {
    map.getSource("pbdb-points").setData(pointsRef.current);

    //map.map.getSource("pbdb-clusters").setData(map.pbdbPoints);
    map.setLayoutProperty("pbdb-clusters", "visibility", "none");
    map.setLayoutProperty("pbdb-points-clustered", "visibility", "visible");
    //    map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'visible')
    // map.map.setLayoutProperty("pbdb-points", "visibility", "visible");
  }
}

export function MacrostratLayerManager() {
  /** Manager for map layers */
  const mapRef = useMapRef();
  return null
  const filters = useAppState((s) => s.core.filters);
  const mapLayers = useAppState((s) => s.core.mapLayers);
  const filteredColumns = useAppState((s) => s.core.filteredColumns);
  const runAction = useAppActions();

  const pbdbPoints = useRef({});

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  // Update filtered columns
  useMapStyleOperator(
    (map) => {
      const source = map.getSource("filteredColumns") as mapboxgl.GeoJSONSource;
      source?.setData({
        type: "FeatureCollection",
        features: filteredColumns ?? [],
      });
    },
    [filteredColumns]
  );

  useMapStyleOperator(
    (map) => {
      const expr = getExpressionForFilters(filters);
      map.setFilter("burwell_fill", expr);
      map.setFilter("burwell_stroke", expr);
    },
    [filters]
  );

  useStyleReloader(pbdbPoints);

  // Map click handler
  const mapClickHandler = useMapClickHandler(pbdbPoints);

  useEffect(() => {
    if (mapRef.current == null) return;
    mapRef.current.on("click", mapClickHandler);
    return () => {
      mapRef.current?.off("click", mapClickHandler);
    };
  }, [mapRef.current, mapClickHandler]);

  // Handle map movement
  const mapMovedHandler = useCallback(() => {
    if (mapRef.current == null) return;
    if (mapLayers.has(MapLayer.FOSSILS)) {
      refreshPBDB(mapRef.current, pbdbPoints, filters);
    }
  }, [mapRef.current, mapLayers, filters]);

  useEffect(() => {
    if (mapRef.current == null) return;
    mapRef.current.on("moveend", mapMovedHandler);
    return () => {
      mapRef.current?.off("moveend", mapMovedHandler);
    };
  }, [mapRef.current, mapMovedHandler]);

  return null;
}

function useStyleReloader(pbdbPoints) {
  // This selection tracking used to be used for PBDB but I think no longer is
  const selectedFeatures = useRef({});
  const filters = useAppState((s) => s.core.filters);
  const mapLayers = useAppState((s) => s.core.mapLayers);

  return useMapStyleOperator(
    (map) => {
      const style = map.getStyle();
      for (const layer of style.layers) {
        selectedFeatures.current[layer.id] = null;

        if (!("source" in layer)) continue;

        if (layer.source === "burwell" && layer["source-layer"] === "units") {
          setVisibility(map, layer.id, mapLayers.has(MapLayer.BEDROCK));
        }
        if (layer.source === "burwell" && layer["source-layer"] === "lines") {
          setVisibility(map, layer.id, mapLayers.has(MapLayer.LINES));
        }
        if (
          layer.source === "pbdb" ||
          layer.source === "pbdb-points" ||
          layer.source === "pbdb-clusters"
        ) {
          setVisibility(map, layer.id, mapLayers.has(MapLayer.FOSSILS));
        }
        if (layer.source === "columns") {
          setVisibility(
            map,
            layer.id,
            mapLayers.has(MapLayer.COLUMNS) && filters.length === 0
          );
        }

        if (layer.source === "filteredColumns") {
          setVisibility(
            map,
            layer.id,
            mapLayers.has(MapLayer.COLUMNS) && filters.length !== 0
          );
        }
      }

      if (mapLayers.has(MapLayer.FOSSILS)) {
        refreshPBDB(map, pbdbPoints, filters);
      }
    },
    [mapLayers, filters]
  );
}

function setVisibility(map, layerID, visible) {
  const visibility = visible ? "visible" : "none";
  map.setLayoutProperty(layerID, "visibility", visibility);
}

export function FlyToPlaceManager() {
  const mapCenter = useAppState((s) => s.core.mapCenter);
  const mapRef = useMapRef();
  useEffect(() => {
    /* Increasing the duration somehow breaks this interaction.
    There's probably some interference between this and the map position handler.
    */
    const duration = 0;

    const map = mapRef.current;
    if (mapCenter.type !== "place" || map == null) return;

    const { bbox, center } = mapCenter.place;
    if (bbox?.length == 4) {
      let bounds = [
        [mapCenter.place.bbox[0], mapCenter.place.bbox[1]],
        [mapCenter.place.bbox[2], mapCenter.place.bbox[3]],
      ];
      map.fitBounds(bounds, {
        duration,
        maxZoom: 16,
      });
    } else {
      map.flyTo({
        center,
        duration,
        zoom: Math.max(map.getZoom() ?? 10, 14),
      });
    }
  }, [mapRef.current, mapCenter]);

  return null;
}

const highlightLayers = [
  { layer: "pbdb-points", source: "pbdb-points" },
  { layer: "pbdb-points-clustered", source: "pbdb-points" },
  { layer: "pbdb-clusters", source: "pbdb-clusters" },
];

export function HoveredFeatureManager() {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();
  const map = mapRef.current;
  const hoveredFeatures = useRef({});

  useEffect(() => {
    if (map == null) return;
    if (!isStyleLoaded) return;
    hoveredFeatures.current = {};
  }, [map, isStyleLoaded]);

  useEffect(() => {
    if (map == null) return;
    const hoverState = hoveredFeatures.current;
    for (const layer of highlightLayers) {
      map.on("mousemove", layer.layer, (evt) => {
        if (evt.features) {
          if (hoverState[layer.layer]) {
            map.setFeatureState(
              { source: layer.source, id: hoverState[layer.layer] },
              { hover: false }
            );
          }
          hoverState[layer.layer] = evt.features[0].id;
          map.setFeatureState(
            { source: layer.source, id: evt.features[0].id },
            { hover: true }
          );
        }
      });

      map.on("mouseleave", layer.layer, (evt) => {
        if (hoverState[layer.layer]) {
          map.setFeatureState(
            { source: layer.source, id: hoverState[layer.layer] },
            { hover: false }
          );
        }
        hoverState[layer.layer] = null;
      });
    }
  }, [map]);
  return null;
}
