import { Suspense, useEffect, useRef } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar from "../components/navbar";
import { Spinner, HTMLDivProps, Button, Switch } from "@blueprintjs/core";
import { useSelector } from "react-redux";
import loadable from "@loadable/component";
import {
  useAppActions,
  useSearchState,
  MapBackend,
  useAppState,
} from "../app-state";
import styles from "./main.module.styl";
import { useLocation } from "react-router-dom";
import { usePerformanceWatcher } from "../performance";
import classNames from "classnames";
import { useTransition } from "transition-hook";
import { useContextPanelOpen, useContextClass } from "../app-state";
import { MapboxMapProvider, ZoomControl } from "@macrostrat/mapbox-react";
import { MapBottomControls, MapStyledContainer } from "./map-view";
import { Routes, Route, useParams } from "react-router-dom";
import { MenuPage, PanelCard } from "./menu";
import { useState } from "react";
import { FloatingNavbar } from "../components/navbar";
import { LocationPanel } from "../components/info-drawer";
import { LinkButton } from "../components/buttons";
import { LoaderButton } from "../components/navbar";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));
const MapContainer = loadable(() => import("./map-view"));
const Menu = loadable(() => import("./menu"));

const h = hyper.styled(styles);

const CesiumViewMod = loadable(() => import("./cesium-view"));
export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

function MapContainerBase(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(MapContainer, props));
}

const MapView = (props: { backend: MapBackend }) => {
  const location = useLocation();
  const runAction = useAppActions();
  const mapBackend = useAppState((d) => d.core.mapBackend);
  const performanceResetToken = useAppState((d) => d.performance.resetToken);
  // Reset token allows observer to be regenerated periodically
  const performanceWatch = usePerformanceWatcher(
    runAction,
    performanceResetToken
  );

  //  backend = MapBackend.CESIUM;
  let { backend = MapBackend.MAPBOX3 } = props;
  // if (location.pathname.includes("/globe")) {
  //   backend = MapBackend.CESIUM;
  // }

  switch (backend) {
    case MapBackend.CESIUM:
      return h(CesiumView);
    default:
      //const use3D = backend == MapBackend.MAPBOX3;
      return h(MapContainerBase);
  }

  useEffect(() => {
    runAction({ type: "set-map-backend", backend });
  }, [backend]);

  const shouldRender = (bkg: MapBackend) => bkg == mapBackend;

  const use3D = backend == MapBackend.MAPBOX3;
  return h([
    h.if(shouldRender(MapBackend.CESIUM))(CesiumView),
    h.if(shouldRender(MapBackend.MAPBOX3))(MapContainer, { use3D }),
  ]);
};

const MapTypeSelector = () => {
  const backend = useAppState((d) => d.core.mapBackend);
  const dispatch = useDispatch();

  const setBackend = (backend) => {
    dispatch({ type: "set-map-backend", backend });
  };

  return h(ButtonGroup, { className: "map-type-selector" }, [
    h(
      Button,
      {
        active: backend == MapBackend.MAPBOX,
        onClick() {
          setBackend(MapBackend.MAPBOX);
        },
      },
      "2D"
    ),
    h(
      Button,
      {
        active: backend == MapBackend.MAPBOX3,
        onClick() {
          setBackend(MapBackend.MAPBOX3);
        },
      },
      "3D"
    ),
    h(
      Button,
      {
        active: backend == MapBackend.CESIUM,
        onClick() {
          setBackend(MapBackend.CESIUM);
        },
      },
      "Globe (alpha)"
    ),
  ]);
};

export const MapPage = ({
  backend = MapBackend.MAPBOX3,
  baseRoute = "/",
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

  const contextPanelOpen = useContextPanelOpen(baseRoute);
  const contextClass = useContextClass(baseRoute);

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

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

type AnyElement = React.ReactNode | React.ReactElement | React.ReactFragment;

function MapAreaContainer({
  children,
  className,
  navbar,
  contextPanel = null,
  detailPanel = null,
  detailPanelOpen,
  contextPanelOpen = true,
  bottomPanel = null,
  mainPanel,
  mapControls = h(MapBottomControls),
  contextStackProps = null,
  detailStackProps = null,
  ...rest
}: {
  navbar: AnyElement;
  children?: AnyElement;
  mapControls?: AnyElement;
  contextPanel?: AnyElement;
  mainPanel?: AnyElement;
  detailPanel?: AnyElement;
  bottomPanel?: AnyElement;
  className?: string;
  detailPanelOpen?: boolean;
  contextPanelOpen?: boolean;
  contextStackProps?: HTMLDivProps;
  detailStackProps?: HTMLDivProps;
}) {
  const _detailPanelOpen = detailPanelOpen ?? detailPanel != null;
  const contextPanelTrans = useTransition(contextPanelOpen, 800);
  const detailPanelTrans = useTransition(_detailPanelOpen, 800);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const _className = classNames(
    {
      searching: false,
      "detail-panel-open": _detailPanelOpen,
    },
    `context-panel-${contextPanelTrans.stage}`,
    `detail-panel-${detailPanelTrans.stage}`
  );

  return h(MapboxMapProvider, [
    h(MapStyledContainer, { className: classNames("map-page", className) }, [
      h("div.main-ui", { className: _className, ...rest }, [
        h("div.context-stack", contextStackProps, [
          navbar,
          h.if(contextPanelTrans.shouldMount)([contextPanel]),
        ]),
        //h(MapView),
        children ?? mainPanel,
        h("div.detail-stack.infodrawer-container", detailStackProps, [
          detailPanel,
          h("div.spacer"),
          mapControls,
        ]),
      ]),
      h("div.bottom", null, bottomPanel),
    ]),
  ]);
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

export function GlobePage() {
  // A stripped-down page for map development
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const [isOpen, setOpen] = useState(false);
  const [showLineSymbols, setShowLineSymbols] = useState(false);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const isDetailPanelOpen = inspectPosition !== null;
  const detailPanelTrans = useTransition(isDetailPanelOpen, 800);

  const [data, setData] = useState(null);

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const className = classNames(
    {
      "detail-panel-open": isDetailPanelOpen,
    },
    //`context-panel-${contextPanelTrans.stage}`,
    `detail-panel-${detailPanelTrans.stage}`
  );

  const [showWireframe, setShowWireframe] = useState(false);

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

  if (!loaded) {
    return h(Spinner);
  }

  return h(MapStyledContainer, { className: "map-page" }, [
    h("div.main-ui", [
      h("div.context-stack", [
        h(FloatingNavbar, { className: "searchbar" }, [
          h("h2", "Globe"),
          h("div.spacer"),
          h(LoaderButton, {
            active: isOpen,
            onClick: () => setOpen(!isOpen),
            isLoading,
          }),
        ]),
        h.if(isOpen)(PanelCard, [
          h(LinkButton, { to: "/" }, "Go to map"),
          h(Switch, {
            onChange: () => setShowWireframe(!showWireframe),
            checked: showWireframe,
            label: "Wireframe",
          }),
        ]),
      ]),
      //h(MapView),
      h(CesiumView, { showWireframe }),
      h("div.detail-stack.infodrawer-container", [
        h.if(detailPanelTrans.shouldMount)([detailElement]),
        h("div.spacer"),
        //h(MapBottomControls),
      ]),
    ]),
  ]);
}

export { MapBackend, MapAreaContainer };
export default MapPageRoutes;
