import { TileTokenRecovery } from "~/components/tile-token-recovery";
import { SETTINGS } from "@macrostrat-web/settings";
import { MapMarker, MapView } from "@macrostrat/map-interface";
import {
  useMapLabelVisibility,
  useMapRef,
  useMapStyleOperator,
  MacrostratLineSymbolManager,
  MapSourcesLayer,
} from "@macrostrat/mapbox-react";
import { PositionFocusState } from "@macrostrat/mapbox-utils";
import {
  getFocusState,
  getTerrainSourceID,
  setGeoJSON,
} from "@macrostrat/mapbox-utils";
import { buildMacrostratStyle } from "@macrostrat/map-styles";
import { getMapboxStyle } from "@macrostrat/mapbox-utils";
import { useInDarkMode } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mapInstanceAtom,
  MapLayer,
  useAppActions,
  useAppState,
} from "../../app-state";
import { writeLastMapPosition } from "~/_utils/last-map-position";
import { CrossSectionLine } from "./cross-section";
import {
  FlyToPlaceManager,
  HoveredFeatureManager,
  MacrostratLayerManager,
  SelectedColumnManager,
} from "./map";
import { getBaseMapStyle } from "@macrostrat-web/map-utils";
import { buildOverlayStyle, mergeMapStyles } from "../map-styles";
import {
  applyCompilationTiles,
  tileRequestTransform,
} from "../../app-state/compilation";
import h from "../main.module.sass";
import { useSetAtom } from "jotai";

mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

export default function MainMapView(props) {
  const mapLayers = useAppState((state) => state.mapLayers);
  const mapPosition = useAppState((state) => state.mapPosition);
  const infoMarkerPosition = useAppState((state) => state.infoMarkerPosition);
  const { children } = props;
  const setMapInstance = useSetAtom(mapInstanceAtom);

  let mapRef = useMapRef();
  const isDarkMode = useInDarkMode();

  const baseMapURL = getBaseMapStyle(
    mapLayers.has(MapLayer.SATELLITE),
    isDarkMode
  );

  // At the moment, these seem to force a re-render of the map
  //const { isInitialized, isStyleLoaded } = useMapStatus();

  const runAction = useAppActions();

  const mapSettings = useAppState((state) => state.mapSettings);
  const compilation = useAppState((state) => state.compilation);

  const [baseStyle, setBaseStyle] = useState(null);
  const mapStyle = useMemo(() => {
    if (baseStyle == null) return null;
    const macrostratStyle = applyCompilationTiles(
      buildMacrostratStyle({
        tileserverDomain: SETTINGS.burwellTileDomain,
      }),
      compilation
    );

    const overlayStyle: any = buildOverlayStyle();

    // if (timeCursorAge != null) {
    //   return applyAgeModelStyles(baseStyle, macrostratStyle, {
    //     age: timeCursorAge,
    //     model: plateModelId ?? 1,
    //     baseStyle,
    //     overlayStyles: overlayStyle,
    //     isDarkMode,
    //     tileserverDomain: SETTINGS.burwellTileDomain,
    //   });
    // }
    let base = baseStyle;
    if (mapSettings.highResolutionTerrain) {
      base = withSeparateTerrainSource(baseStyle);
    }
    return mergeMapStyles(base, macrostratStyle, overlayStyle);
  }, [baseStyle, isDarkMode, compilation, mapSettings.highResolutionTerrain]);

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
    // Connect the map instance to Jotai state management
    setMapInstance(map);

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

  // Make map label visibility match the mapLayers state
  useMapLabelVisibility(mapRef, mapLayers.has(MapLayer.LABELS));

  const onMapMoved = useCallback((pos, map) => {
    // Persist the settled camera as the shared last-viewed location.
    writeLastMapPosition(pos);
    runAction({ type: "map-moved", data: { mapPosition: pos } });
  }, []);

  const terrainSourceID = useMemo(() => {
    if (mapStyle == null) return null;
    if (mapStyle.sources?.[TERRAIN_SOURCE_ID] == null) return null;
    return TERRAIN_SOURCE_ID;
  }, [mapStyle]);

  return h(
    MapView,
    {
      projection: { name: "globe" },
      ...props,
      infoMarkerPosition,
      onMapLoaded,
      style: mapStyle,
      mapPosition,
      terrainSourceID,
      mapboxToken: SETTINGS.mapboxAccessToken,
      transformRequest: tileRequestTransform,
      onMapMoved,
    },
    [
      children,
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
      h(SelectedColumnManager),
      h(TileTokenRecovery),
    ]
  );
}

/** The elevation source 3D terrain is drawn from, apart from the hillshade's.
 *
 * Terrain and a hillshade sharing one `raster-dem` source make Mapbox load that
 * source at terrain resolution, and the hillshade loses its detail once terrain
 * switches on. A second source with the same tiles keeps them independent, at
 * the cost of loading the tiles twice. `setup3DTerrain` uses a named source as
 * given, so the copy has to be in the style itself. */
const TERRAIN_SOURCE_ID = "macrostrat-terrain-dem";

function withSeparateTerrainSource(style) {
  const demID = getTerrainSourceID(style);
  if (demID == null) return style;

  const next = {
    ...style,
    sources: { ...style.sources, [TERRAIN_SOURCE_ID]: { ...style.sources[demID] } },
  };
  if (style.terrain?.source == demID) {
    next.terrain = { ...style.terrain, source: TERRAIN_SOURCE_ID };
  }
  return next;
}

function ColumnDataManager() {
  /* Update columns map layer given columns provided by application. */
  const allColumns = useAppState((state) => state.allColumns);
  useMapStyleOperator(
    (map) => {
      const ncols = allColumns?.length ?? 0;
      if (ncols == 0) return;
      setGeoJSON(map, "columns", {
        type: "FeatureCollection",
        features: allColumns,
      });
    },
    [allColumns]
  );
  return null;
}
