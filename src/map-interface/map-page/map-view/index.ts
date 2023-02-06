import { forwardRef, useRef, useState, useCallback } from "react";
import {
  useAppActions,
  useAppState,
  MapLayer,
  PositionFocusState,
} from "~/map-interface/app-state";
import Map from "./map";
import { enable3DTerrain } from "./terrain";
import { GeolocateControl } from "mapbox-gl";
import hyper from "@macrostrat/hyper";
import { useEffect, useMemo } from "react";
import useResizeObserver from "use-resize-observer";
import styles from "../main.module.styl";
import {
  useMapRef,
  CompassControl,
  GlobeControl,
  ThreeDControl,
  useMapConditionalStyle,
  useMapLabelVisibility,
  MapControlWrapper,
} from "@macrostrat/mapbox-react";
import classNames from "classnames";
import { debounce } from "underscore";
import { inDarkMode } from "@macrostrat/ui-components";
import {
  mapViewInfo,
  getMapPosition,
  setMapPosition,
  getMapboxStyle,
  mergeStyles,
  MapPosition,
} from "@macrostrat/mapbox-utils";
import { getExpressionForFilters } from "./filter-helpers";
import { MapSourcesLayer, mapStyle, toggleLineSymbols } from "../map-style";
import { SETTINGS } from "../../settings";
import mapboxgl from "mapbox-gl";
import { ColumnProperties } from "~/map-interface/app-state/handlers/columns";
import {
  useMapEaseToCenter,
  getFocusState,
  useElevationMarkerLocation,
  getBaseMapStyle,
  getMapPadding,
  useMapMarker,
  MapStyledContainer,
  MapBottomControls,
} from "./utils";

export { MapStyledContainer, MapBottomControls };

const h = hyper.styled(styles);

const VestigialMap = forwardRef((props, ref) => h(Map, { ...props, ref }));

async function buildMapStyle(baseMapURL) {
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  return mergeStyles(style, mapStyle);
}

async function initializeMap(baseMapURL, mapPosition, infoMarkerPosition) {
  // setup the basic map
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: await buildMapStyle(baseMapURL),
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

export function DevMapView() {
  return h(CoreMapView);
}

export default function MainMapView(props) {
  const {
    filters,
    filteredColumns,
    mapLayers,
    mapCenter,
    elevationChartOpen,
    elevationData,
    elevationMarkerLocation,
    mapPosition,
    infoDrawerOpen,
    mapSettings,
  } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  const mapIsLoading = useAppState((state) => state.core.mapIsLoading);
  useElevationMarkerLocation(mapRef, elevationMarkerLocation);
  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);
  const runAction = useAppActions();
  const markerRef = useRef(null);
  const handleMapQuery = useMapQueryHandler(mapRef, markerRef, infoDrawerOpen);
  const isDarkMode = inDarkMode();

  return h(CoreMapView, props, [
    h(VestigialMap, {
      filters,
      filteredColumns,
      // Recreate the set every time to force a re-render
      mapLayers,
      mapCenter,
      elevationChartOpen,
      elevationData,
      elevationMarkerLocation,
      mapPosition,
      mapIsLoading,
      mapIsRotated,
      onQueryMap: handleMapQuery,
      mapRef,
      isDark: isDarkMode,
      runAction,
      ...props,
    }),
    h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
  ]);
}

function CoreMapView(props) {
  const { filters, mapLayers, mapPosition, infoDrawerOpen, mapSettings } =
    useAppState((state) => state.core);

  const { children } = props;

  const mapIsLoading = useAppState((state) => state.core.mapIsLoading);

  const runAction = useAppActions();
  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);

  let mapRef = useMapRef();

  const ref = useRef<HTMLDivElement>();
  const parentRef = useRef<HTMLDivElement>();
  const { mapUse3D, mapIsRotated } = mapViewInfo(mapPosition);

  const isDarkMode = inDarkMode();
  const baseMapURL = getBaseMapStyle(mapLayers, isDarkMode);

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
    initializeMap(baseMapURL, mapPosition, infoMarkerPosition).then((map) => {
      mapRef.current = map;

      if (!map.isStyleLoaded()) {
        map.once("style.load", () => {
          setStyleLoaded(true);
        });
      } else {
        setStyleLoaded(true);
      }

      /* Right now we need to reload filters when the map is initialized.
         Otherwise our (super-legacy and janky) filter system doesn't know
         to update the map. */
      //runAction({ type: "set-filters", filters: [...filters] });
      setMapInitialized(true);
      // Update map padding on load
      updateMapPadding();
      toggleLineSymbols(map, hasLineSymbols);
    });
  }, []);

  /* If we want to use a high resolution DEM, we need to use a different
    source ID from the hillshade's source ID. This uses more memory but
    provides a nicer-looking 3D map.
    */
  const demSourceID = mapSettings.highResolutionTerrain
    ? "mapbox-3d-dem"
    : null;

  useEffect(() => {
    if (mapRef.current == null) return;
    buildMapStyle(baseMapURL).then((style) => {
      mapRef.current.setStyle(style);
      enable3DTerrain(mapRef.current, mapUse3D, demSourceID);
    });
  }, [baseMapURL, demSourceID]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    enable3DTerrain(map, mapUse3D, demSourceID);
  }, [mapRef.current, mapUse3D]);

  const markerRef = useRef(null);
  const handleMapQuery = useMapQueryHandler(mapRef, markerRef, infoDrawerOpen);

  useMapEaseToCenter(padding);
  useMapMarker(mapRef, markerRef, infoMarkerPosition);

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
    // Get the current value of the map. Useful for gradually moving away
    // from class component
    const map = mapRef.current;
    if (map == null) return;

    // Update the URI when the map moves
    const mapMovedCallback = () => {
      const marker = markerRef.current;
      const map = mapRef.current;

      runAction({
        type: "map-moved",
        data: {
          mapPosition: getMapPosition(map),
          infoMarkerFocus: getFocusState(map, marker?.getLngLat()),
        },
      });
    };
    mapMovedCallback();
    map.on("moveend", debounce(mapMovedCallback, 100));
  }, [mapInitialized]);

  useEffect(() => {
    if (mapLayers.has(MapLayer.COLUMNS)) {
      runAction({ type: "get-filtered-columns" });
    }
    runAction({ type: "map-layers-changed", mapLayers });
  }, [filters, mapLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || !mapInitialized || !styleLoaded) return;
    const expr = getExpressionForFilters(filters);

    map.setFilter("burwell_fill", expr);
    map.setFilter("burwell_stroke", expr);
  }, [filters, mapInitialized, styleLoaded]);

  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
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

function useMapQueryHandler(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  markerRef: React.RefObject<mapboxgl.Marker | null>,
  infoDrawerOpen: boolean
) {
  /** Handler for map query markers */
  const runAction = useAppActions();

  return useCallback(
    (event: mapboxgl.MapMouseEvent, columns: ColumnProperties[] = null) => {
      const column = columns?.[0];
      const map = mapRef.current;

      runAction({
        type: "map-query",
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        z: map.getZoom(),
        column,
        map_id: null,
      });

      const marker =
        markerRef.current ?? new mapboxgl.Marker({ color: "#000000" });
      marker.setLngLat(event.lngLat).addTo(mapRef.current);
      markerRef.current = marker;
    },
    [mapRef, markerRef, infoDrawerOpen]
  );
}
