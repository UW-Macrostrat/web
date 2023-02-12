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
  mapStyle,
  toggleLineSymbols,
} from "../map-interface/map-page/map-style";
import { CoreMapView, MapMarker } from "~/map-interface/map-page/map-view";
import styles from "./main.module.styl";
import { group } from "d3-array";
import { ExpansionPanel } from "~/map-interface/components/expansion-panel";

export enum MacrostratTileset {
  Carto = "carto",
  CartoSlim = "carto-slim",
}

const h = hyper.styled(styles);

export function DevMapPage({
  headerElement = null,
  tileset = MacrostratTileset.CartoSlim,
}: {
  headerElement?: React.ReactElement;
  tileset?: MacrostratTileset;
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
  const [xRay, setXRay] = useState(true);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const [data, setData] = useState(null);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

  const onSelectPosition = useCallback((position: mapboxgl.LngLat) => {
    setInspectPosition(position);
  }, []);

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
          checked: xRay,
          label: "X-ray mode",
          onChange() {
            setXRay(!xRay);
          },
        }),
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
    h(
      DevMapView,
      {
        showLineSymbols,
        markerPosition: inspectPosition,
        setMarkerPosition: onSelectPosition,
        styleOptions: { xRay, tileset },
      },
      [
        h(FeatureSelectionHandler, {
          selectedLocation: inspectPosition,
          setFeatures: setData,
        }),
      ]
    )
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

function FeatureSelectionHandler({
  selectedLocation,
  setFeatures,
}: {
  selectedLocation: mapboxgl.LngLat;
  setFeatures: (features: mapboxgl.MapboxGeoJSONFeature[]) => void;
}) {
  const mapRef = useMapRef();
  const isLoading = useAppState((state) => state.core.mapIsLoading);

  useEffect(() => {
    const map = mapRef?.current;
    if (map == null) return;
    if (selectedLocation == null) {
      setFeatures(null);
      return;
    }

    const r = 2;
    const pt = map.project(selectedLocation);

    const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [pt.x - r, pt.y - r],
      [pt.x + r, pt.y + r],
    ];
    const features = map.queryRenderedFeatures(bbox);
    setFeatures(features);
  }, [mapRef?.current, selectedLocation, isLoading]);

  return null;
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

function LoadingAwareFeatureSet({ features, sourceID }) {
  const map = useMapRef();
  if (map?.current == null) return null;
  const [isLoaded, setIsLoaded] = useState(false);

  const sourceFeatures = features.filter((d) => d.source == "burwell");

  useEffect(() => {
    if (sourceFeatures.length > 0) {
      setIsLoaded(true);
      return;
    }

    const isLoaded = map.current.isSourceLoaded(sourceID);
    setIsLoaded(isLoaded);
    if (!isLoaded) {
      map.current.once("sourcedata", (e) => {
        if (e.sourceId == sourceID) {
          setIsLoaded(true);
        }
      });
    }
  }, [map.current, sourceID, sourceFeatures.length]);

  if (!isLoaded) return h(Spinner);
  return h(Features, { features: sourceFeatures });
}

function FeaturePanel({ features }) {
  if (features == null) return null;
  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        title: "Macrostrat features",
        className: "macrostrat-features",
        expanded: true,
      },
      [
        h(LoadingAwareFeatureSet, {
          features,
          sourceID: "burwell",
        }),
      ]
    ),
    h(
      ExpansionPanel,
      { title: "Basemap features", className: "basemap-features" },
      [
        h(Features, {
          features: features.filter((d) => d.source != "burwell"),
        }),
      ]
    ),
  ]);
}

function Features({ features }) {
  /** Group features by source and sourceLayer */
  if (features == null) return null;

  const groups = group(features, (d) => `${d.source} - ${d.sourceLayer}`);

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

function setSourceTileset(style: mapboxgl.Style, tileset: MacrostratTileset) {
  return {
    ...style,
    sources: {
      ...style.sources,
      burwell: {
        type: "vector",
        tiles: [
          `https://next.macrostrat.org/tiles/tiles/${tileset}/{z}/{x}/{y}`,
        ],
        tileSize: 512,
      },
    },
  };
}

interface DevMapStyleOptions {
  inDarkMode?: boolean;
  xRay?: boolean;
  tileset?: MacrostratTileset;
}

async function buildDevMapStyle(
  baseMapURL: string,
  styleOptions: DevMapStyleOptions = {}
) {
  const style = await getMapboxStyle(baseMapURL, {
    access_token: mapboxgl.accessToken,
  });
  const {
    inDarkMode,
    xRay = false,
    tileset = MacrostratTileset.CartoSlim,
  } = styleOptions;
  const overlayStyles: any = xRay ? buildXRayStyle({ inDarkMode }) : mapStyle;

  return removeMapLabels(
    mergeStyles(style, setSourceTileset(overlayStyles, tileset))
  );
}

async function initializeDevMap(baseMapURL, mapPosition, styleOptions) {
  mapboxgl.accessToken = SETTINGS.mapboxAccessToken;
  const style = await buildDevMapStyle(baseMapURL, styleOptions);

  const map = new mapboxgl.Map({
    container: "map",
    style,
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

interface DevMapViewProps {
  showLineSymbols: boolean;
  markerPosition: mapboxgl.LngLat;
  setMarkerPosition: (pos: mapboxgl.LngLat) => void;
  styleOptions: DevMapStyleOptions;
  children: React.ReactNode;
}

export function DevMapView(props: DevMapViewProps) {
  const {
    showLineSymbols,
    markerPosition,
    setMarkerPosition,
    styleOptions,
    children,
  } = props;
  const { mapPosition } = useAppState((state) => state.core);

  let mapRef = useMapRef();
  const isDarkMode = inDarkMode();

  const baseMapURL = getBaseMapStyle(new Set([]), isDarkMode);

  /* HACK: Right now we need this to force a render when the map
    is done loading
    */
  const [mapInitialized, setMapInitialized] = useState(false);

  // Map initialization
  useEffect(() => {
    initializeDevMap(baseMapURL, mapPosition, {
      inDarkMode: isDarkMode,
      ...styleOptions,
    }).then((map) => {
      mapRef.current = map;
      setMapInitialized(true);
    });
  }, []);

  // Map style updating
  useEffect(() => {
    const map = mapRef.current;
    if (map == null) return;
    buildDevMapStyle(baseMapURL, {
      ...styleOptions,
      inDarkMode: isDarkMode,
    }).then((style) => {
      map.setStyle(style);
    });
  }, [styleOptions.xRay, isDarkMode]);

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
    children,
  ]);
}

export { MapStyledContainer, MapBottomControls };
