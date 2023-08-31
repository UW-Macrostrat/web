import hyper from "@macrostrat/hyper";
import {
  MapBottomControls,
  MapMarker,
  MapStyledContainer,
  MapView,
} from "@macrostrat/map-interface";
import {
  getFocusState,
  PositionFocusState,
  useMapLabelVisibility,
  useMapRef,
  useMapDispatch,
  useMapStatus,
  useMapPosition,
} from "@macrostrat/mapbox-react";
import { MacrostratLineSymbolManager } from "@macrostrat/mapbox-styles";
import {
  getMapboxStyle,
  mapViewInfo,
  mergeStyles,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { inDarkMode } from "@macrostrat/ui-components";
import { LineString } from "geojson";
import mapboxgl from "mapbox-gl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";
import { SETTINGS } from "../../settings";
import styles from "../main.module.styl";
import { applyAgeModelStyles } from "../map-style";
import {
  buildMacrostratStyle,
  MapSourcesLayer,
} from "@macrostrat/mapbox-styles";
import { getExpressionForFilters } from "./filter-helpers";
import Map from "./map";
import { getBaseMapStyle, useCrossSectionCursorLocation } from "./utils";
import { refreshPBDB } from "./map";

const h = hyper.styled(styles);

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const VestigialMap = forwardRef((props, ref) => h(Map, { ...props, ref }));

function initializeMap(container, opts) {
  // setup the basic map
  const { style, mapPosition, ...rest } = opts;

  const map = new mapboxgl.Map({
    container,
    style,
    maxZoom: 18,
    //maxTileCacheSize: 0,
    logoPosition: "bottom-left",
    trackResize: true,
    antialias: true,
    optimizeForTerrain: true,
    ...rest,
  });

  // set initial map position
  setMapPosition(map, mapPosition);
  return map;
}

export default function MainMapView(props) {
  const {
    filters,
    filteredColumns,
    mapLayers,
    mapCenter,
    crossSectionLine,
    crossSectionCursorLocation,
    mapPosition,
    infoDrawerOpen,
    timeCursorAge,
    plateModelId,
    infoMarkerPosition,
    focusedMapSource,
  } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  const dispatch = useMapDispatch();
  useCrossSectionCursorLocation(mapRef, crossSectionCursorLocation);
  const { mapIsRotated } = mapViewInfo(mapPosition);
  const runAction = useAppActions();
  const handleMapQuery = useMapQueryHandler(mapRef, infoDrawerOpen);
  const isDarkMode = inDarkMode();

  const baseMapURL = getBaseMapStyle(mapLayers, isDarkMode);
  const { isInitialized, isStyleLoaded } = useMapStatus();

  const [baseStyle, setBaseStyle] = useState(null);
  const mapStyle = useMemo(() => {
    if (baseStyle == null) return null;
    const overlayStyles = buildMacrostratStyle({
      focusedMap: focusedMapSource,
      tileserverDomain: SETTINGS.burwellTileDomain,
    });
    if (timeCursorAge != null) {
      return applyAgeModelStyles(
        timeCursorAge,
        plateModelId ?? 1,
        baseStyle,
        overlayStyles,
        isDarkMode
      );
    }
    return mergeStyles(baseStyle, overlayStyles);
  }, [baseStyle, timeCursorAge, plateModelId, isDarkMode, focusedMapSource]);

  useEffect(() => {
    getMapboxStyle(baseMapURL, {
      access_token: mapboxgl.accessToken,
    }).then((s) => {
      setBaseStyle(s);
    });
  }, [baseMapURL]);

  const onMapLoaded = useCallback((map) => {
    // disable shift-key zooming so we can use shift to make cross-sections
    map.boxZoom.disable();

    /* If we have an initially loaded info marker, we need to make sure
    that it is actually visible on the map, and move to it if not.
    This works around cases where the map is initialized with a hash string
    that contradicts the focused location (which would happen if the link was
    saved once the marker was moved out of view).
    */
    if (infoMarkerPosition != null) {
      const focus = getFocusState(map, infoMarkerPosition);
      if (
        ![
          PositionFocusState.CENTERED,
          PositionFocusState.NEAR_CENTER,
          PositionFocusState.OFF_CENTER,
        ].includes(focus)
      ) {
        map.setCenter(infoMarkerPosition);
      }
    }
  }, []);

  // Filters
  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !isStyleLoaded) return;
    const expr = getExpressionForFilters(filters);
    console.log("Setting filters", expr);
    map.setFilter("burwell_fill", expr, { validate: false });
    map.setFilter("burwell_stroke", expr, { validate: false });
  }, [filters, isInitialized, isStyleLoaded, mapRef.current]);

  // useEffect(() => {
  //   if (baseStyle == null) {
  //     return;
  //   }
  //   if (mapRef?.current != null) {
  //     mapRef.current.setStyle(mapStyle);
  //     return;
  //   }
  //   const map = initializeMap("map", {
  //     style: mapStyle,
  //     mapPosition,
  //     projection: "globe",
  //   });
  //   map.on("style.load", () => {
  //     dispatch({ type: "set-style-loaded", payload: true });
  //   });
  //   onMapLoad(map);
  //   dispatch({ type: "set-map", payload: map });

  //   /* Right now we need to reload filters when the map is initialized.
  //       Otherwise our (super-legacy and janky) filter system doesn't know
  //       to update the map. */
  // }, [mapStyle]);

  /* If we want to use a high resolution DEM, we need to use a different
    source ID from the hillshade's source ID. This uses more memory but
    provides a nicer-looking 3D map.
    */

  // Make map label visibility match the mapLayers state
  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  return h(
    CoreMapView,
    {
      style: mapStyle,
      mapPosition,
      onMapLoaded,
      infoMarkerPosition,
    },
    [
      h(VestigialMap, {
        filters,
        filteredColumns,
        // Recreate the set every time to force a re-render
        mapLayers,
        mapCenter,
        mapStyle,
        crossSectionLine,
        crossSectionCursorLocation,
        mapPosition,
        mapIsRotated,
        onQueryMap: handleMapQuery,
        mapRef,
        isDark: isDarkMode,
        runAction,
        ...props,
      }),
      h(MapMarker, {
        position: infoMarkerPosition,
      }),
      h(CrossSectionLine),
      h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
      h(ColumnDataManager),
      h(MapPositionReporter, { initialMapPosition: mapPosition }),
      h(LayerVisibilityManager, { mapLayers }),
    ]
  );
}

function LayerVisibilityManager({ mapLayers }) {
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
        setVisibility(map, layer.id, mapLayers.has(MapLayer.COLUMNS));
      }

      if (mapLayers.has(MapLayer.FOSSILS)) {
        refreshPBDB(map, pbdbPoints, filters);
      }
    }
  }, [mapLayers, isStyleLoaded]);

  return null;
}

function setVisibility(map, layerID, visible) {
  const visibility = visible ? "visible" : "none";
  map.setLayoutProperty(layerID, "visibility", visibility);
}

function MapPositionReporter({ initialMapPosition = null }) {
  // Connects map position to Redux app state
  const mapPosition = useMapPosition() ?? initialMapPosition;
  const runAction = useAppActions();

  useEffect(() => {
    runAction({ type: "map-moved", data: { mapPosition } });
  }, [mapPosition]);

  return null;
}
function ColumnDataManager() {
  /* Update columns map layer given columns provided by application. */
  const mapRef = useMapRef();
  const { isInitialized } = useMapStatus();
  const allColumns = useAppState((state) => state.core.allColumns);
  useEffect(() => {
    const map = mapRef.current;
    const ncols = allColumns?.length ?? 0;
    if (map == null || ncols == 0) return;
    // Set source data for columns
    map.once("style.load", () => {
      const src = map.getSource("columns");
      if (src == null) return;
      src.setData({
        type: "FeatureCollection",
        features: allColumns ?? [],
      });
    });
    const src = map.getSource("columns");
    if (src == null) return;
    src.setData({
      type: "FeatureCollection",
      features: allColumns ?? [],
    });
  }, [mapRef.current, allColumns, isInitialized]);
  return null;
}

interface MapViewProps {
  showLineSymbols?: boolean;
  children?: React.ReactNode;
}

export function CoreMapView(props: MapViewProps) {
  const { mapLayers, mapSettings } = useAppState((state) => state.core);
  const hasLineSymbols =
    mapLayers.has(MapLayer.LINE_SYMBOLS) && mapLayers.has(MapLayer.LINES);

  const { children } = props;

  return h(
    MapView,
    {
      ...props,
      terrainSourceID: mapSettings.highResolutionTerrain
        ? "mapbox-3d-dem"
        : null,
      accessToken: SETTINGS.mapboxAccessToken,
    },
    [
      h(MacrostratLineSymbolManager, { showLineSymbols: hasLineSymbols }),
      children,
    ]
  );
}

export function CrossSectionLine() {
  const mapRef = useMapRef();
  const crossSectionLine = useAppState((state) => state.core.crossSectionLine);
  const previousLine = useRef<LineString | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    const coords = crossSectionLine?.coordinates ?? [];

    let lines = [];
    if (coords.length == 2 || crossSectionLine == null) {
      previousLine.current = crossSectionLine;
    }

    if (crossSectionLine != null) {
      lines.push(crossSectionLine);
    }

    if (previousLine.current != null) {
      // We are selecting a new line, and we should still show the previous line
      // until the new one is selected.
      lines.push(previousLine.current);
    }

    let endpointFeatures = [];
    for (let line of lines) {
      for (let coord of line.coordinates) {
        endpointFeatures.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coord,
          },
        });
      }
    }

    map.getSource("crossSectionLine")?.setData({
      type: "GeometryCollection",
      geometries: lines,
    });
    map.getSource("crossSectionEndpoints")?.setData({
      type: "FeatureCollection",
      features: endpointFeatures,
    });
  }, [mapRef.current, crossSectionLine]);
  return null;
}

function useMapQueryHandler(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  infoDrawerOpen: boolean
) {
  /** Handler for map query markers */
  const runAction = useAppActions();

  return useCallback(
    (event: mapboxgl.MapMouseEvent, columns: ColumnProperties[] = null) => {
      const map = mapRef.current;

      runAction({
        type: "map-query",
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        z: map.getZoom(),
        columns,
        map_id: null,
      });

      // const marker =
      //   markerRef.current ?? new mapboxgl.Marker({ color: "#000000" });
      // marker.setLngLat(event.lngLat).addTo(mapRef.current);
      // markerRef.current = marker;
    },
    [mapRef, infoDrawerOpen]
  );
}

export { MapStyledContainer, MapBottomControls, MapMarker };
