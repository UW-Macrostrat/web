import { SETTINGS } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { MapMarker, MapView } from "@macrostrat/map-interface";
import {
  PositionFocusState,
  getFocusState,
  useMapLabelVisibility,
  useMapRef,
  useMapStatus,
  useMapStyleOperator,
} from "@macrostrat/mapbox-react";
import {
  MacrostratLineSymbolManager,
  MapSourcesLayer,
  buildMacrostratStyle,
} from "@macrostrat/mapbox-styles";
import { getMapboxStyle, mergeStyles } from "@macrostrat/mapbox-utils";
import { useInDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "~/pages/map/map-interface/app-state";
import styles from "../main.module.styl";
import { CrossSectionLine } from "./cross-section";
import {
  FlyToPlaceManager,
  HoveredFeatureManager,
  MacrostratLayerManager,
} from "./map";
import { getBaseMapStyle } from "@macrostrat-web/map-utils";
import { buildOverlayStyle, applyAgeModelStyles } from "../map-styles";

const h = hyper.styled(styles);

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

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
  const isDarkMode = useInDarkMode();

  const baseMapURL = getBaseMapStyle(
    mapLayers.has(MapLayer.SATELLITE),
    isDarkMode
  );

  // At the moment, these seem to force a re-render of the map
  const { isInitialized, isStyleLoaded } = useMapStatus();

  const runAction = useAppActions();

  const mapSettings = useAppState((state) => state.core.mapSettings);

  const [baseStyle, setBaseStyle] = useState(null);
  const mapStyle = useMemo(() => {
    if (baseStyle == null) return null;
    const macrostratStyle = buildMacrostratStyle({
      focusedMap: focusedMapSource,
      tileserverDomain: SETTINGS.burwellTileDomain,
    });

    const overlayStyle = buildOverlayStyle();

    if (timeCursorAge != null) {
      return applyAgeModelStyles(baseStyle, macrostratStyle, {
        age: timeCursorAge,
        model: plateModelId ?? 1,
        baseStyle,
        overlayStyles: overlayStyle,
        isDarkMode,
        tileserverDomain: SETTINGS.burwellTileDomain,
      });
    }
    return mergeStyles(baseStyle, macrostratStyle, overlayStyle);
  }, [baseStyle, timeCursorAge, plateModelId, isDarkMode, focusedMapSource]);

  useEffect(() => {
    getMapboxStyle(baseMapURL, {
      access_token: mapboxgl.accessToken,
    }).then((s) => {
      setBaseStyle(s);
    });
  }, [baseMapURL]);

  const hasLineSymbols =
    mapLayers.has(MapLayer.LINE_SYMBOLS) && mapLayers.has(MapLayer.LINES);

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

  /* If we want to use a high resolution DEM, we need to use a different
    source ID from the hillshade's source ID. This uses more memory but
    provides a nicer-looking 3D map.
    */

  // Make map label visibility match the mapLayers state
  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));

  const onMapMoved = useCallback((pos, map) => {
    runAction({ type: "map-moved", data: { mapPosition: pos } });
  }, []);

  return h(
    MapView,
    {
      projection: { name: "globe" },
      ...props,
      infoMarkerPosition,
      onMapLoaded,
      style: mapStyle,
      mapPosition,
      terrainSourceID: mapSettings.highResolutionTerrain
        ? "mapbox-3d-dem"
        : null,
      mapboxToken: SETTINGS.mapboxAccessToken,
      onMapMoved,
    },
    [
      h(MacrostratLineSymbolManager, { showLineSymbols: hasLineSymbols }),
      h(MapMarker, {
        position: infoMarkerPosition,
      }),
      h(CrossSectionLine),
      h.if(mapLayers.has(MapLayer.SOURCES))(MapSourcesLayer),
      h(ColumnDataManager),
      h(MacrostratLayerManager),
      h(FlyToPlaceManager),
      h(HoveredFeatureManager),
    ]
  );
}

function ColumnDataManager() {
  /* Update columns map layer given columns provided by application. */
  const allColumns = useAppState((state) => state.core.allColumns);
  useMapStyleOperator(
    (map) => {
      const ncols = allColumns?.length ?? 0;
      if (ncols == 0) return;
      const source = map.getSource("columns");
      if (source == null) return;
      source.setData({
        type: "FeatureCollection",
        features: allColumns,
      });
    },
    [allColumns]
  );
  return null;
}
