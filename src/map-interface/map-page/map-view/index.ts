import hyper from "@macrostrat/hyper";
import {
  useMapConditionalStyle,
  useMapLabelVisibility,
  useMapRef,
} from "@macrostrat/mapbox-react";
import {
  getMapboxStyle,
  getMapPosition,
  mapViewInfo,
  mergeStyles,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { inDarkMode } from "@macrostrat/ui-components";
import classNames from "classnames";
import mapboxgl from "mapbox-gl";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "underscore";
import useResizeObserver from "use-resize-observer";
import {
  MapLayer,
  PositionFocusState,
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
} from "../map-style";
import { getExpressionForFilters } from "./filter-helpers";
import Map from "./map";
import { enable3DTerrain } from "./terrain";
import {
  getBaseMapStyle,
  getFocusState,
  getMapPadding,
  MapBottomControls,
  MapStyledContainer,
  usecrossSectionCursorLocation as useCrossSectionCursorLocation,
  useMapEaseToCenter,
  useMapMarker,
} from "./utils";

const h = hyper.styled(styles);

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

const VestigialMap = forwardRef((props, ref) => h(Map, { ...props, ref }));

function buildStyle(style, age, model = 1, isDark = false) {
  const overlayStyles = buildMacrostratStyle();
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
    crossSectionOpen,
    crossSectionCursorLocation,
    mapPosition,
    infoDrawerOpen,
    mapIsLoading,
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

  /* Update columns map layer given columns provided by application. */
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
      crossSectionOpen,
      crossSectionCursorLocation,
      mapPosition,
      mapIsLoading,
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
    h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
  ]);
}

interface MapViewProps {
  showLineSymbols?: boolean;
  children?: React.ReactNode;
}

export function CoreMapView(props: MapViewProps) {
  const { filters, mapLayers, mapPosition, infoDrawerOpen, mapSettings } =
    useAppState((state) => state.core);

  const { children } = props;

  // Maybe this shouldn't be global state necessarily...
  // Could integrate with context...
  const mapIsLoading = useAppState((state) => state.core.mapIsLoading);

  const runAction = useAppActions();

  let mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();
  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);

  const [padding, setPadding] = useState(getMapPadding(ref, parentRef));
  const infoMarkerPosition = useAppState(
    (state) => state.core.infoMarkerPosition
  );

  const hasLineSymbols =
    mapLayers.has(MapLayer.LINE_SYMBOLS) && mapLayers.has(MapLayer.LINES);

  const updateMapPadding = useCallback(() => {
    setPadding(getMapPadding(ref, parentRef));
  }, [ref, parentRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    // Update map padding on load
    updateMapPadding();
    toggleLineSymbols(map, hasLineSymbols);
  }, [mapRef.current]);

  const demSourceID = mapSettings.highResolutionTerrain
    ? "mapbox-3d-dem"
    : null;
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    enable3DTerrain(map, mapUse3D, demSourceID);
  }, [mapRef.current, mapUse3D]);

  useMapEaseToCenter(padding);

  useEffect(() => {
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    const map = mapRef.current;
    if (map == null) return;

    // Update the URI when the map moves
    const mapMovedCallback = () => {
      const map = mapRef.current;

      runAction({
        type: "map-moved",
        data: {
          mapPosition: getMapPosition(map),
          infoMarkerFocus: getFocusState(map, infoMarkerPosition),
        },
      });
    };
    mapMovedCallback();
    map.on("moveend", debounce(mapMovedCallback, 100));
  }, [mapRef.current]);

  // Map loading state
  const ignoredSources = ["elevationMarker", "elevationPoints"];

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;

    map.on("sourcedataloading", (evt) => {
      if (ignoredSources.includes(evt.sourceId) || mapIsLoading) return;
      runAction({ type: "map-loading" });
    });

    map.on("idle", () => {
      if (!mapIsLoading) return;
      runAction({ type: "map-idle" });
    });
  }, [mapRef.current, mapIsLoading]);

  useMapConditionalStyle(mapRef, hasLineSymbols, toggleLineSymbols);

  useResizeObserver({
    ref: parentRef,
    onResize(sz) {
      updateMapPadding();
    },
  });

  const debouncedResize = useRef(
    debounce(() => {
      mapRef.current?.resize();
    }, 100)
  );

  useResizeObserver({
    ref,
    onResize: debouncedResize.current,
  });

  const className = classNames({
    "is-rotated": mapIsRotated ?? false,
    "is-3d-available": mapUse3D ?? false,
  });

  return h("div.map-view-container.main-view", { ref: parentRef }, [
    h("div.mapbox-map#map", { ref, className }),
    children,
  ]);
}

export function MapMarker({ position, setPosition, centerMarker = true }) {
  const mapRef = useMapRef();
  const markerRef = useRef(null);

  useMapMarker(mapRef, markerRef, position);

  const handleMapClick = useCallback(
    (event: mapboxgl.MapMouseEvent) => {
      setPosition(event.lngLat, event, mapRef.current);
      // We should integrate this with the "easeToCenter" hook
      if (centerMarker) {
        mapRef.current?.flyTo({ center: event.lngLat, duration: 800 });
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapRef.current, setPosition]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (map != null && setPosition != null) {
      map.on("click", handleMapClick);
    }
    return () => {
      map?.off("click", handleMapClick);
    };
  }, [mapRef.current, setPosition]);

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

export { MapStyledContainer, MapBottomControls };
