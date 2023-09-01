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
  mergeStyles,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { inDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";
import { SETTINGS } from "../../settings";
import styles from "../main.module.styl";
import { applyAgeModelStyles } from "../map-style";
import {
  buildMacrostratStyle,
  MapSourcesLayer,
} from "@macrostrat/mapbox-styles";
import { CrossSectionLine } from "./cross-section";
import {
  FlyToPlaceManager,
  HoveredFeatureManager,
  MacrostratLayerManager,
} from "./map";

const h = hyper.styled(styles);

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

function getBaseMapStyle(mapLayers, isDarkMode = false) {
  if (mapLayers.has(MapLayer.SATELLITE)) {
    return SETTINGS.satelliteMapURL;
  }
  if (isDarkMode) {
    return SETTINGS.darkMapURL;
  }
  return SETTINGS.baseMapURL;
}

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
    mapLayers,
    mapPosition,
    timeCursorAge,
    plateModelId,
    infoMarkerPosition,
    focusedMapSource,
  } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  const dispatch = useMapDispatch();
  const isDarkMode = inDarkMode();

  const baseMapURL = getBaseMapStyle(mapLayers, isDarkMode);

  // At the moment, these seem to force a re-render of the map
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

  return h(
    CoreMapView,
    { ...props, infoMarkerPosition, onMapLoaded, style: mapStyle, mapPosition },
    [
      h(MapMarker, {
        position: infoMarkerPosition,
      }),
      h(CrossSectionLine),
      h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
      h(ColumnDataManager),
      h(MapPositionReporter, { initialMapPosition: mapPosition }),
      h(MacrostratLayerManager),
      h(FlyToPlaceManager),
      h(HoveredFeatureManager),
    ]
  );
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

export { MapStyledContainer, MapBottomControls, MapMarker };
