import { Suspense, useEffect, useRef } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar from "../components/searchbar";
import { ButtonGroup, Button, Spinner } from "@blueprintjs/core";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useDispatch, useSelector } from "react-redux";
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
import { usePanelOpen, useContextClass } from "../app-state";
import { MapboxMapProvider, ZoomControl } from "@macrostrat/mapbox-react";
import { MapBottomControls, MapStyledContainer } from "./map-view";

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

const MapPage = ({ backend = MapBackend.MAPBOX3, baseRoute = "/" }) => {
  const { inputFocus } = useSearchState();
  const runAction = useAppActions();
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);

  const ref = useRef<HTMLElement>(null);

  const contextPanelOpen = usePanelOpen(baseRoute);
  const contextClass = useContextClass(baseRoute);

  const contextPanelTrans = useTransition(contextPanelOpen || inputFocus, 800);
  const detailPanelTrans = useTransition(infoDrawerOpen, 800);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const className = classNames(
    {
      searching: inputFocus,
      "detail-panel-open": infoDrawerOpen,
    },
    `context-panel-${contextPanelTrans.stage}`,
    `detail-panel-${detailPanelTrans.stage}`
  );

  const onMouseDown = (event) => {
    if (!(inputFocus || contextPanelOpen)) return;
    if (ref.current?.contains(event.target)) return;

    runAction({ type: "context-outside-click" });
    event.stopPropagation();
  };

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  if (!loaded) return h(Spinner);

  return h(MapboxMapProvider, [
    h(MapStyledContainer, { className: "map-page" }, [
      h(
        "div.main-ui",
        {
          className,
          onMouseDown,
        },
        [
          h("div.context-stack", { className: contextClass, ref }, [
            h(Searchbar, { className: "searchbar", baseRoute }),
            h.if(contextPanelTrans.shouldMount)(Menu, {
              className: "context-panel",
              baseRoute,
            }),
          ]),
          h(MapView, {
            backend,
          }),
          h("div.detail-stack.infodrawer-container", [
            h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
              className: "detail-panel",
            }),
            h(ZoomControl, { className: "zoom-control" }),
            h("div.spacer"),
            h(MapBottomControls),
          ]),
        ]
      ),
      h("div.bottom", null, h(ElevationChart, null)),
    ]),
  ]);
};

//const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default MapPage;
