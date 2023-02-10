import { Suspense } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar, { LoaderButton } from "../components/navbar";
import {
  ButtonGroup,
  Button,
  Spinner,
  Switch,
  HTMLDivProps,
} from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";
import { JSONView } from "@macrostrat/ui-components";
import {
  useSearchState,
  MapBackend,
  useAppState,
  useAppActions,
} from "../app-state";
import styles from "./main.module.styl";
import classNames from "classnames";
import { useRef, useEffect } from "react";
import { useTransition } from "transition-hook";
import { useContextPanelOpen, useContextClass } from "../app-state";
import { MapboxMapProvider, ZoomControl } from "@macrostrat/mapbox-react";
import { DevMapView, MapBottomControls, MapStyledContainer } from "./map-view";
import { Routes, Route, useParams } from "react-router-dom";
import { MenuPage, PanelCard } from "./menu";
import { useState } from "react";
import { FloatingNavbar } from "../components/navbar";
import { LocationPanel } from "../components/info-drawer";
import { useCallback } from "react";
import { MapAreaContainer } from "../components/map-page";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));
const MapContainer = loadable(() => import("./map-view"));
const Menu = loadable(() => import("./menu"));

const h = hyper.styled(styles);

//const CesiumViewMod = loadable(() => import("./cesium-view"));
const CesiumViewMod = () => h("div", "Globe is currently disabled");

export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

function MapContainerBase(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(MapContainer, props));
}

const MapView = (props: { backend: MapBackend }) => {
  const { backend = MapBackend.MAPBOX3 } = props;
  switch (backend) {
    case MapBackend.CESIUM:
      return h(CesiumView);
    default:
      //const use3D = backend == MapBackend.MAPBOX3;
      return h(MapContainerBase);
  }
};

export const MapPage = ({
  backend = MapBackend.MAPBOX3,
  menuPage = null,
}: {
  backend?: MapBackend;
  menuPage?: MenuPage;
}) => {
  const { inputFocus } = useSearchState();
  const runAction = useAppActions();
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  const navMenuPage = useAppState((s) => s.menu.activePage);

  const ref = useRef<HTMLElement>(null);

  const contextPanelOpen = useContextPanelOpen();

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const contextClass = useContextClass();

  const onMouseDown = (event) => {
    if (!(inputFocus || contextPanelOpen)) return;
    if (ref.current?.contains(event.target)) return;

    runAction({ type: "context-outside-click" });
    event.stopPropagation();
  };

  if (!loaded) {
    return h(Spinner);
  }

  return h(MapAreaContainer, {
    navbar: h(Searchbar, { className: "searchbar" }),
    contextPanel: h(Menu, {
      className: "context-panel",
      menuPage: menuPage ?? navMenuPage,
    }),
    contextStackProps: {
      className: contextClass,
    },
    mainPanel: h(MapView),
    detailPanel: h([
      h(Routes, [
        h(Route, {
          path: "/loc/:lng/:lat",
          element: h(InfoDrawerRoute),
        }),
      ]),
      h(ZoomControl, { className: "zoom-control" }),
    ]),
    bottomPanel: h(ElevationChart, null),
    contextPanelOpen: contextPanelOpen || inputFocus,
    detailPanelOpen: infoDrawerOpen,
    onMouseDown,
    className: inputFocus ? "searching" : null,
  });
};

function MapPageRoutes() {
  return h(Routes, [
    h(
      Object.values(MenuPage).map((page) =>
        h(Route, { path: page, element: h(MapPage, { menuPage: page }) })
      )
    ),
    h(Route, { path: "*", element: h(MapPage) }),
  ]);
}

function InfoDrawerRoute() {
  const { lat, lng } = useParams();
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  const z = Math.round(
    useAppState((s) => s.core.mapPosition.target?.zoom) ?? 7
  );
  const detailPanelTrans = useTransition(infoDrawerOpen, 800);
  const runAction = useAppActions();
  const allColumns = useAppState((s) => s.core.allColumns);

  useEffect(() => {
    if (lat && lng) {
      runAction({
        type: "run-map-query",
        lat: Number(lat),
        lng: Number(lng),
        z,
      });
    }
  }, [lat, lng, allColumns]);

  return h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
    className: "detail-panel",
  });
}

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
      h(Features, { features: data })
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
  return h("div.feature-record", [
    h("div.feature-record-header", [
      h(KeyValue, { label: "Source", value: feature.source }),
      h(KeyValue, { label: "Layer", value: feature.sourceLayer }),
    ]),
    h(JSONView, { data: feature.properties, hideRoot: true }),
  ]);
}

function KeyValue({ label, value }) {
  return h("span.key-value", [h("span.key", label), h("code.value", value)]);
}

function Features({ features }) {
  return h(
    "div.features",
    features.map((feature) => h(FeatureRecord, { feature }))
  );
}

//const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default MapPageRoutes;
