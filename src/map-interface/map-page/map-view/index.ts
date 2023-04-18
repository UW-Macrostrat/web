import hyper from "@macrostrat/hyper";
import {
  useMapConditionalStyle,
  useMapLabelVisibility,
  useMapRef,
} from "@macrostrat/mapbox-react";
import {
  getMapboxStyle,
  mapViewInfo,
  mergeStyles,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { inDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";
import { SETTINGS } from "../../settings";
import styles from "../main.module.styl";
import {
  applyAgeModelStyles,
  buildMacrostratStyle,
  MapSourcesLayer,
  toggleLineSymbols,
} from "@macrostrat/map-interface/src/styles";
import { getExpressionForFilters } from "./filter-helpers";
import Map from "./map";
import { MapBottomControls } from "@macrostrat/map-interface/src/controls";
import { MapStyledContainer } from "@macrostrat/map-interface";
import { getBaseMapStyle, useCrossSectionCursorLocation } from "./utils";
import { getFocusState, PositionFocusState } from "@macrostrat/mapbox-react";
import { MapMarker } from "@macrostrat/map-interface/src/helpers";
import { MapView } from "@macrostrat/map-interface";
import { LineString } from "geojson";
import { MacrostratLineSymbolManager } from "@macrostrat/map-interface/src/styles";

const h = hyper.styled(styles);

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const VestigialMap = forwardRef((props, ref) => h(Map, { ...props, ref }));

function buildStyle(style, age, model = 1, isDark = false) {
  const overlayStyles = buildMacrostratStyle({
    tileserverDomain: SETTINGS.burwellTileDomain,
  });
  if (age != null) {
    return applyAgeModelStyles(age, model, style, overlayStyles, isDark);
  }
  return mergeStyles(style, overlayStyles);
}

async function initializeMap(
  baseStyle,
  age,
  model,
  isDark,
  mapPosition,
  infoMarkerPosition
) {
  // setup the basic map

  const map = new mapboxgl.Map({
    container: "map",
    style: buildStyle(baseStyle, age, model, isDark),
    maxZoom: 18,
    //maxTileCacheSize: 0,
    logoPosition: "bottom-left",
    trackResize: true,
    antialias: true,
    optimizeForTerrain: true,
  });

  map.setProjection("globe");

  // disable shift-key zooming so we can use shift to make cross-sections
  map.boxZoom.disable();

  // set initial map position
  setMapPosition(map, mapPosition);

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
  } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  useCrossSectionCursorLocation(mapRef, crossSectionCursorLocation);
  const { mapIsRotated } = mapViewInfo(mapPosition);
  const runAction = useAppActions();
  const handleMapQuery = useMapQueryHandler(mapRef, infoDrawerOpen);
  const isDarkMode = inDarkMode();

  const baseMapURL = getBaseMapStyle(mapLayers, isDarkMode);

  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);

  const [baseStyle, setBaseStyle] = useState(null);
  useEffect(() => {
    getMapboxStyle(baseMapURL, {
      access_token: mapboxgl.accessToken,
    }).then((s) => {
      setBaseStyle(s);
    });
  }, [baseMapURL]);

  useEffect(() => {
    if (baseStyle == null) {
      return;
    }
    initializeMap(
      baseStyle,
      timeCursorAge,
      plateModelId,
      isDarkMode,
      mapPosition,
      infoMarkerPosition
    ).then((map) => {
      if (!map.isStyleLoaded()) {
        map.once("style.load", () => {
          setStyleLoaded(true);
        });
      } else {
        setStyleLoaded(true);
      }

      mapRef.current = map;

      /* Right now we need to reload filters when the map is initialized.
        Otherwise our (super-legacy and janky) filter system doesn't know
        to update the map. */
      //runAction({ type: "set-filters", filters: [...filters] });
      setMapInitialized(true);
    });
  }, [baseStyle]);

  /* If we want to use a high resolution DEM, we need to use a different
    source ID from the hillshade's source ID. This uses more memory but
    provides a nicer-looking 3D map.
    */

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    setMapPosition(map, mapPosition);
  }, [mapRef.current, mapInitialized]);

  useEffect(() => {
    if (mapRef.current == null || baseStyle == null) return;
    const newStyle = buildStyle(
      baseStyle,
      timeCursorAge,
      plateModelId,
      isDarkMode
    );
    mapRef.current.setStyle(newStyle);
  }, [baseStyle, timeCursorAge, plateModelId, isDarkMode]);

  // Make map label visibility match the mapLayers state
  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  // Filters
  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !map?.isStyleLoaded()) return;
    const expr = getExpressionForFilters(filters);

    map.setFilter("burwell_fill", expr);
    map.setFilter("burwell_stroke", expr);
  }, [filters, mapInitialized, styleLoaded]);

  return h(CoreMapView, props, [
    h(VestigialMap, {
      filters,
      filteredColumns,
      // Recreate the set every time to force a re-render
      mapLayers,
      mapCenter,
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
    h(ColumnDataManager, { mapInitialized }),
  ]);
}

function ColumnDataManager({ mapInitialized }) {
  /* Update columns map layer given columns provided by application. */
  const mapRef = useMapRef();
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
  }, [mapRef.current, allColumns, mapInitialized]);
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
