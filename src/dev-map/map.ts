// Import other components
import { Spinner, Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useMapConditionalStyle, useMapRef } from "@macrostrat/mapbox-react";
import {
  getMapboxStyle,
  mergeStyles,
  removeMapLabels,
  setMapPosition,
} from "@macrostrat/mapbox-utils";
import { inDarkMode, JSONView } from "@macrostrat/ui-components";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTransition } from "transition-hook";
import { SETTINGS } from "~/map-interface/settings";
import { LoaderButton } from "../map-interface/components/navbar";
import { useAppActions, useAppState } from "../map-interface/app-state";
import { LocationPanel } from "../map-interface/components/info-drawer";
import { FloatingNavbar } from "../map-interface/components/navbar";
import { MapAreaContainer } from "../map-interface/map-page";
import { PanelCard } from "../map-interface/map-page/menu";
import {
  getBaseMapStyle,
  MapBottomControls,
  MapStyledContainer,
} from "../map-interface/map-page/map-view/utils";
import {
  buildXRayStyle,
  toggleLineSymbols,
} from "../map-interface/map-page/map-style";
import { CoreMapView, MapMarker } from "~/map-interface/map-page/map-view";
import styles from "./main.module.styl";
import { group } from "d3-array";

const h = hyper.styled(styles);

export function DevMapPage({
  headerElement = null,
}: {
  headerElement?: React.ReactElement;
}) {
  // A stripped-down page for map development
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const [isOpen, setOpen] = useState(false);
  const [showLineSymbols, setShowLineSymbols] = useState(false);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const isDetailPanelOpen = inspectPosition !== null;
  const detailPanelTrans = useTransition(isDetailPanelOpen, 800);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback(
    (
      position: mapboxgl.LngLat,
      event: mapboxgl.MapMouseEvent,
      map: mapboxgl.Map
    ) => {
      setInspectPosition(position);
      let features = null;

      const r = 2;
      const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
        [event.point.x - r, event.point.y - r],
        [event.point.x + r, event.point.y + r],
      ];
      if (position != null) {
        features = map.queryRenderedFeatures(bbox);
      }
      setData(features);
    },
    []
  );

  let detailElement = null;
  if (inspectPosition != null) {
    detailElement = h(
      LocationPanel,
      {
        onClose() {
          setInspectPosition(null);
        },
        position: inspectPosition,
      },
      h(FeaturePanel, { features: data })
    );
  }

  if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      navbar: h(FloatingNavbar, { className: "searchbar" }, [
        headerElement,
        h("div.spacer"),
        h(LoaderButton, {
          active: isOpen,
          onClick: () => setOpen(!isOpen),
          isLoading,
        }),
      ]),
      contextPanel: h(PanelCard, [
        h(Switch, {
          checked: showLineSymbols,
          label: "Show line symbols",
          onChange() {
            setShowLineSymbols(!showLineSymbols);
          },
        }),
      ]),
      detailPanel: detailElement,
      contextPanelOpen: isOpen,
    },
    h(DevMapView, {
      showLineSymbols,
      markerPosition: inspectPosition,
      setMarkerPosition: onSelectPosition,
    })
  );
}

function FeatureRecord({ feature }) {
  const props = feature.properties;
  return h("div.feature-record", [
    h.if(Object.keys(props).length > 0)("div.feature-properties", [
      h(JSONView, {
        data: props,
        hideRoot: true,
      }),
    ]),
  ]);
}

function FeatureHeader({ feature }) {
  const props = feature.properties;
  return h("div.feature-header", [
    h("h3", [
      h(KeyValue, { label: "Source", value: feature.source }),
      h(KeyValue, { label: "Source layer", value: feature.sourceLayer }),
    ]),
  ]);
}

function KeyValue({ label, value }) {
  return h("span.key-value", [h("span.key", label), h("code.value", value)]);
}

function FeaturePanel({ features }) {
  if (features == null) return null;
  return h("div.feature-panel", [h(Features, { features })]);
}

function Features({ features }) {
  /** Group features by source and sourceLayer */
  if (features == null) return null;

  const groups = group(features, (d) => `${d.source} - ${d.sourceLayer}`);

  let entries = groups.entries();

  return h(
    "div.features",
    Array.from(groups).map(([key, features]) => {
      return h("div.feature-group", [
        h(FeatureHeader, { feature: features[0] }),
        features.map((feature, i) => h(FeatureRecord, { key: i, feature })),
      ]);
    })
  );
}

async function buildDevMapStyle(baseMapURL, styleOptions = {}) {
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  const xRayStyle = buildXRayStyle(styleOptions);
  return removeMapLabels(mergeStyles(style, xRayStyle));
}

async function initializeDevMap(baseMapURL, mapPosition, styleOptions) {
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: await buildDevMapStyle(baseMapURL, styleOptions),
    maxZoom: 18,
    //maxTileCacheSize: 0,
    logoPosition: "bottom-left",
    trackResize: true,
    antialias: true,
    optimizeForTerrain: true,
  });

  setMapPosition(map, mapPosition);
  map.showTileBoundaries = false;

  return map;
}

export function DevMapView(props) {
  const { showLineSymbols, markerPosition, setMarkerPosition } = props;
  const { mapPosition, mapIsLoading } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  const isDarkMode = inDarkMode();

  const baseMapURL = getBaseMapStyle(new Set([]), isDarkMode);

  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    initializeDevMap(baseMapURL, mapPosition, { inDarkMode: isDarkMode }).then(
      (map) => {
        mapRef.current = map;
        setMapInitialized(true);
      }
    );
  }, [isDarkMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    setMapPosition(map, mapPosition);
  }, [mapRef.current, mapInitialized]);

  // This seems to do a bit of a poor job at the moment. Maybe because fo caching?
  useMapConditionalStyle(mapRef, showLineSymbols, toggleLineSymbols);

  return h(CoreMapView, null, [
    h(MapMarker, {
      position: markerPosition,
      setPosition: setMarkerPosition,
    }),
  ]);
}

export { MapStyledContainer, MapBottomControls };
