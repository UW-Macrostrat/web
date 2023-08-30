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
import { useRef, useEffect } from "react";
import { useTransition } from "transition-hook";
import { useContextPanelOpen, useContextClass } from "../app-state";
import { MapAreaContainer } from "@macrostrat/map-interface";
import { Routes, Route, useParams } from "react-router-dom";
import classNames from "classnames";
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
  const mapPosition = useAppState((s) => s.core.mapPosition);

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

  return h(
    MapAreaContainer,
    {
      navbar: h(Searchbar, { className: "searchbar" }),
      contextPanel: h(Menu, {
        className: "context-panel",
        menuPage: menuPage ?? navMenuPage,
      }),
      detailPanel: h(Routes, [
        h(Route, {
          path: "loc/:lng/:lat/*",
          element: h(InfoDrawerRoute),
        }),
      ]),

      bottomPanel,
      contextPanelOpen: contextPanelOpen || inputFocus,
      detailPanelOpen: infoDrawerOpen,
      mapPosition,
      className: classNames(
        "macrostrat-map-container",
        inputFocus ? "searching" : contextClass,
        contextPanelOpen || inputFocus ? "context-open" : "context-closed"
      ),
      fitViewport: true,
    },
    [h("div.context-underlay", { onClick: onMouseDown }), h(MapView)]
  );
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

//const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend, MapAreaContainer };
export default MapPageRoutes;
