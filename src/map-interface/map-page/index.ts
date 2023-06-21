import { Suspense } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar from "../components/navbar";
import { Spinner, HTMLDivProps } from "@blueprintjs/core";
import { useSelector } from "react-redux";
import loadable from "@loadable/component";
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
import { MapBottomControls, MapStyledContainer } from "./map-view";
import { Routes, Route, useParams } from "react-router-dom";
import { TimescalePanel } from "../paleo";
import { MenuPage } from "./menu";

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

function MapView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(MapContainer, props));
}

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

  const inPaleoMode = useAppState((s) => s.core.timeCursorAge != null);

  if (!loaded) {
    return h(Spinner);
  }

  const bottomPanel = inPaleoMode ? h(TimescalePanel) : h(ElevationChart, null);

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
          path: "loc/:lng/:lat/*",
          element: h(InfoDrawerRoute),
        }),
      ]),
      h(ZoomControl, { className: "zoom-control" }),
    ]),
    bottomPanel,
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

//const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend, MapAreaContainer };
export default MapPageRoutes;
