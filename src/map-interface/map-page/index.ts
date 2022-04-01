import { Suspense, useEffect } from "react";
// Import other components
import MapContainer from "./map-view";
import hyper, { compose } from "@macrostrat/hyper";
import Searchbar from "../components/searchbar";
import MenuContainer, { useContextClass } from "./menu";
import InfoDrawer from "../components/info-drawer";
import ElevationChart from "../components/elevation-chart";
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
import { useState, useRef } from "react";

const h = hyper.styled(styles);

//const CesiumViewMod = loadable(() => import("./cesium-view"));
const CesiumViewMod = () => h("div", "Globe is currently disabled");

export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

const MapView = (props: { backend: MapBackend }) => {
  const { backend = MapBackend.MAPBOX3 } = props;
  switch (backend) {
    case MapBackend.CESIUM:
      return h(CesiumView);
    default:
      //const use3D = backend == MapBackend.MAPBOX3;
      return h(MapContainer);
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

function hTrans(isOpen, { animate = true, duration = 500 } = {}) {
  const [isShown, setIsShown] = useState(isOpen);
  const isAnimating = isShown !== isOpen;
  useEffect(() => {
    if (isOpen == isShown) return;
    if (animate) {
      setTimeout(() => setIsShown(isOpen), duration);
    } else {
      setIsShown(isOpen);
    }
  }, [isOpen, animate]);

  return (tag, props = {}, children = null) => {
    const { className = "", ...rest } = props;
    const classes = classNames(className, "transition-item", {
      animating: isAnimating,
      entering: isAnimating && isOpen,
      exiting: isAnimating && !isOpen,
    });
    return h.if(isShown || isOpen)(
      tag,
      { className: classes, ...rest },
      children
    );
  };
}

const MapPage = ({ backend = MapBackend.MAPBOX3 }) => {
  const { inputFocus } = useSearchState();
  const { menuOpen } = useMenuState();
  const runAction = useAppActions();
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  const contextPanelOpen = useAppState((s) => s.core.contextPanelOpen);
  const ref = useRef<HTMLElement>(null);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const className = classNames({
    searching: inputFocus && contextPanelOpen,
    "detail-panel-open": infoDrawerOpen,
  });

  const contextClass = useContextClass();

  const onMouseDown = (event) => {
    if (!(inputFocus || contextPanelOpen)) return;
    if (ref.current?.contains(event.target)) return;
    runAction({ type: "context-outside-click" });
    event.stopPropagation();
  };

  return h("div.map-page", [
    h(
      "div.main-ui",
      {
        className,
        onMouseDown,
      },
      [
        h("div.context-stack", { className: contextClass, ref }, [
          h(Searchbar, { className: "searchbar" }),
          hTrans(contextPanelOpen)(MenuContainer),
        ]),

        h(MapView, {
          backend,
        }),

        h("div.detail-stack.infodrawer-container", [
          hTrans(infoDrawerOpen)(InfoDrawer),
          h("div.spacer"),
        ]),
      ]
    ),
    h("div.bottom", null, h(ElevationChart, null)),
  ]);
};

const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default _MapPage;
