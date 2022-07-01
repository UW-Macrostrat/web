import { Suspense } from "react";
// Import other components
import hyper, { compose } from "@macrostrat/hyper";
import Searchbar from "../components/searchbar";
import Menu, { useContextClass } from "./menu";
import {
  ButtonGroup,
  Button,
  Spinner,
  Collapse,
  HotkeysProvider,
} from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";
import {
  useSearchState,
  MapBackend,
  useMenuState,
  useAppState,
  useAppActions,
} from "../app-state";
import styles from "./main.module.styl";
import classNames from "classnames";
import { useRef, useEffect } from "react";
import { useTransition } from "transition-hook";
import { usePanelOpen } from "./menu";
import { useNavigate } from "react-router-dom";
import {
  MapboxMapProvider,
  MapBottomControls,
  MapStyledContainer,
  MapZoomControl,
} from "./map-view";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));
const MapContainer = loadable(() => import("./map-view"));

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

const MapTypeSelector = () => {
  const backend = useSelector((d) => d.update.mapBackend);
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

function MenuPanel() {
  const { inputFocus } = useSearchState();
  const { menuOpen } = useMenuState();
  return h(Collapse, { isOpen: inputFocus || menuOpen }, [
    //h(CloseableCard, { className: "menu-card", isOpen: true }, []),
  ]);
}

const MapPage = ({ backend = MapBackend.MAPBOX3 }) => {
  const { inputFocus } = useSearchState();
  const { menuOpen } = useMenuState();
  const runAction = useAppActions();
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  //const contextPanelOpen = useAppState((s) => s.core.contextPanelOpen);

  const ref = useRef<HTMLElement>(null);

  const navigate = useNavigate();

  const contextPanelOpen = usePanelOpen();

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

  const contextClass = useContextClass();

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
            h(Searchbar, { className: "searchbar" }),
            h.if(contextPanelTrans.shouldMount)(Menu, {
              className: "context-panel",
            }),
          ]),
          h(MapView, {
            backend,
          }),
          h("div.detail-stack.infodrawer-container", [
            h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
              className: "detail-panel",
            }),
            h(MapZoomControl),
            h("div.spacer"),
            h(MapBottomControls),
          ]),
        ]
      ),
      h("div.bottom", null, h(ElevationChart, null)),
    ]),
  ]);
};

const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default _MapPage;
