import { Component, forwardRef } from "react";
import { getPBDBData } from "./filter-helpers";
import h from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { buildMacrostratStyle } from "@macrostrat/mapbox-styles";
import { setMapStyle } from "./style-helpers";
import {
  AppAction,
  MapAction,
  MapLayer,
  useAppActions,
} from "~/map-interface/app-state";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";
import { SETTINGS } from "~/map-interface/settings";
import { useMapRef, useMapStatus } from "@macrostrat/mapbox-react";
import { useEffect, useRef, useCallback } from "react";
import { useAppState } from "~/map-interface/app-state";

const highlightLayers = [
  { layer: "pbdb-points", source: "pbdb-points" },
  { layer: "pbdb-points-clustered", source: "pbdb-points" },
  { layer: "pbdb-clusters", source: "pbdb-clusters" },
];

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
        let pointPixels = this.map.project(f.geometry.coordinates);
        let pixelDistance = Math.sqrt(
          Math.pow(event.point.x - pointPixels.x, 2) +
            Math.pow(event.point.y - pointPixels.y, 2)
        );
        return Math.abs(pixelDistance) <= 50;
      })
      .map((f) => {
        return f.properties.oid.replace("col:", "");
      });
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
  } else {
    // Otherwise make sure that old fossil collections aren't visible
    return { type: "reset-pbdb" };
  }
  return null;
}

function handleCrossSectionClick(event, _crossSectionLine): MapAction | null {
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

function useMapClickHandler(props) {
  const mapRef = useMapRef();
  const runAction = useAppActions();

  const { crossSectionLine, mapLayers, pbdbPoints } = props;

  return useCallback(
    (event) => {
      const map = mapRef.current;

      const action = handleCrossSectionClick(event, crossSectionLine);
      if (action != null) {
        runAction(action);
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
        }
      }

      // Otherwise try to query the geologic map
      let features = map.queryRenderedFeatures(event.point, {
        layers: ["burwell_fill", "column_fill", "filtered_column_fill"],
      });

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
    [mapRef.current]
  );
}

class VestigialMap extends Component<MapProps, {}> {
  map: mapboxgl.Map;
  marker: mapboxgl.Marker | null = null;
  crossSectionEndpoints: [number, number][] = [];
  constructor(props) {
    super(props);
    this.crossSectionEndpoints = [];

    this.maxValue = 500;
    this.previousZoom = 0;

    // We need to store these for cluster querying...
    this.pbdbPoints = {};

    // Keep track of unique ids for interaction states
    this.hoverStates = {};
    this.selectedStates = {};
  }

  setupMapHandlers() {
    if (this.map != null) {
      return;
    }

    this.map = this.props.mapRef.current;

    if (this.map == null) {
      return;
    }
    // disable map rotation using right click + drag
    //this.map.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    //this.map.touchZoomRotate.disableRotation();

    this.map.on("moveend", () => {
      // Force a hit to the API to refresh
      if (this.props.mapLayers.has(MapLayer.FOSSILS)) {
        this.refreshPBDB();
      }
    });

    highlightLayers.forEach((layer) => {
      this.map.on("mousemove", layer.layer, (evt) => {
        if (evt.features) {
          if (this.hoverStates[layer.layer]) {
            this.map.setFeatureState(
              { source: layer.source, id: this.hoverStates[layer.layer] },
              { hover: false }
            );
          }
          this.hoverStates[layer.layer] = evt.features[0].id;
          this.map.setFeatureState(
            { source: layer.source, id: evt.features[0].id },
            { hover: true }
          );
        }
      });

      this.map.on("mouseleave", layer.layer, (evt) => {
        if (this.hoverStates[layer.layer]) {
          this.map.setFeatureState(
            { source: layer.source, id: this.hoverStates[layer.layer] },
            { hover: false }
          );
        }
        this.hoverStates[layer.layer] = null;
      });
    });

    this.map.on("click", (event) => {});
  }

  // Handle updates to the state of the map
  // Since react isn't in charge of updating the map state we use shouldComponentUpdate
  // and always return `false` to prevent DOM updates
  // We basically intercept the changes, handle them, and tell React to ignore them
  shouldComponentUpdate(nextProps) {
    const { mapStyle } = nextProps;
    this.setupMapHandlers();
    if (this.map == null || mapStyle == null) return false;

    setMapStyle(
      this,
      this.map,
      buildMacrostratStyle({
        tileserverDomain: SETTINGS.burwellTileDomain,
      }),
      nextProps
    );

    if (nextProps.mapIsRotated !== this.props.mapIsRotated) {
      return true;
    }

    // Watch the state of the application and adjust the map accordingly
    if (
      !nextProps.crossSectionOpen &&
      this.props.crossSectionOpen &&
      this.map
    ) {
      this.crossSectionEndpoints = [];
      this.map.getSource("crossSectionEndpoints").setData({
        type: "FeatureCollection",
        features: [],
      });
      this.map.getSource("crossSectionLine").setData({
        type: "FeatureCollection",
        features: [],
      });
    }
    // Bedrock
    if (
      JSON.stringify(nextProps.mapCenter) !=
      JSON.stringify(this.props.mapCenter)
    ) {
      if (nextProps.mapCenter.type === "place") {
        const { bbox, center } = nextProps.mapCenter.place;
        if (bbox?.length == 4) {
          let bounds = [
            [
              nextProps.mapCenter.place.bbox[0],
              nextProps.mapCenter.place.bbox[1],
            ],
            [
              nextProps.mapCenter.place.bbox[2],
              nextProps.mapCenter.place.bbox[3],
            ],
          ];
          this.map.fitBounds(bounds, {
            duration: 0,
            maxZoom: 16,
          });
        } else {
          this.map.flyTo({
            center,
            duration: 0,
            zoom: Math.max(
              nextProps.mapPosition?.camera?.target?.zoom ?? 10,
              14
            ),
          });
        }
      } else {
        // zoom to user location
      }
    }

    return false;
  }

  // Update the colors of the hexgrids
  updateColors(data) {
    for (let i = 0; i < data.length; i++) {
      this.map.setFeatureState(
        {
          source: "pbdb",
          sourceLayer: "hexgrid",
          id: data[i].hex_id,
        },
        {
          color: this.colorScale(parseInt(data[i].count)),
        }
      );
    }
  }

  colorScale(val) {
    let mid = this.maxValue / 2;

    // Max
    if (Math.abs(val - this.maxValue) <= Math.abs(val - mid)) {
      return "#2171b5";
      // Mid
    } else if (Math.abs(val - mid) <= Math.abs(val - 1)) {
      return "#6baed6";
      // Min
    } else {
      return "#bdd7e7";
    }
  }

  render() {
    return null;
  }
}

export default forwardRef((props, ref) =>
  h(VestigialMap, { ...props, elementRef: ref })
);

// PBDB hexgrids and points are refreshed on every map move
export async function refreshPBDB(map, pointsRef, filters) {
  let bounds = map.getBounds();
  let zoom = map.getZoom();
  const maxClusterZoom = 7;
  pointsRef.current = await getPBDBData(filters, bounds, zoom, maxClusterZoom);

  // Show or hide the proper PBDB layers
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

export function MacrostratLayerManager({ mapLayers, filters }) {
  const mapRef = useMapRef();
  const { isStyleLoaded } = useMapStatus();

  const hoverStates = useRef({});
  const selectedStates = useRef({});
  const pbdbPoints = useRef({});

  useEffect(() => {
    if (!isStyleLoaded) return;
    const map = mapRef.current;
    if (map == null) return;
    const style = map.getStyle();
    for (const layer of style.layers) {
      hoverStates.current[layer.id] = null;
      selectedStates.current[layer.id] = null;

      if (!("source" in layer)) continue;

      if (layer.source === "burwell" && layer["source-layer"] === "units") {
        setVisibility(map, layer.id, mapLayers.has(MapLayer.BEDROCK));
      }
      if (layer.source === "burwell" && layer["source-layer"] === "lines") {
        setVisibility(map, layer.id, mapLayers.has(MapLayer.LINES));
      }
      if (layer.source === "pbdb" || layer.source === "pbdb-points") {
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
  }, [mapLayers, isStyleLoaded]);

  const crossSectionLine = useAppState((s) => s.core.crossSectionLine);
  // Map click handler
  const mapClickHandler = useMapClickHandler({
    crossSectionLine: crossSectionLine,
    mapLayers,
  });

  useEffect(() => {
    if (mapRef.current == null) return;
    mapRef.current.on("click", mapClickHandler);
    return () => {
      mapRef.current.off("click", mapClickHandler);
    };
  }, [mapRef.current, mapClickHandler]);

  return null;
}

function setVisibility(map, layerID, visible) {
  const visibility = visible ? "visible" : "none";
  map.setLayoutProperty(layerID, "visibility", visibility);
}
