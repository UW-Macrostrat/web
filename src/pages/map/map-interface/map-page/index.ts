import { Suspense, useCallback, useEffect, useRef } from "react";
// Import other components
import { Spinner } from "@blueprintjs/core";
import loadable from "@loadable/component";
import { mapPagePrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { MapAreaContainer } from "@macrostrat/map-interface";
import classNames from "classnames";
import { useSelector } from "react-redux";
import { Route, Routes, useParams } from "react-router-dom";
import { useTransition } from "transition-hook";
import {
  useAppActions,
  useAppState,
  useContextClass,
  useContextPanelOpen,
} from "../app-state";
import Searchbar from "../components/navbar";
import styles from "./main.module.styl";
import MapContainer from "./map-view";
import { MenuPage } from "./menu";
import { info } from "console";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));
const Menu = loadable(() => import("./menu"));

const h = hyper.styled(styles);

function MapView(props) {
  return h(
    Suspense,
    { fallback: h("div.map-view-placeholder") },
    h(MapContainer, props)
  );
}

export const MapPage = ({
  baseRoute = "/",
  menuPage = null,
}: {
  menuPage?: MenuPage;
}) => {
  const runAction = useAppActions();
  const inputFocus = useAppState((s) => s.core.inputFocus);
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  const navMenuPage = useAppState((s) => s.menu.activePage);

  const ref = useRef<HTMLElement>(null);

  const contextPanelOpen = useContextPanelOpen(baseRoute);
  const contextClass = useContextClass(baseRoute);

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const onMouseDown = useCallback(
    (event) => {
      if (!(inputFocus || contextPanelOpen)) return;
      if (ref.current?.contains(event.target)) return;

      runAction({ type: "context-outside-click" });
      event.stopPropagation();
    },
    [inputFocus, contextPanelOpen]
  );

  if (!loaded) {
    return h(Spinner);
  }

  return h(
    MapAreaContainer,
    {
      navbar: h(Searchbar, { className: "searchbar" }),
      contextPanel: h(Menu, {
        className: "context-panel",
        menuPage: menuPage ?? navMenuPage,
      }),
      detailPanel: h(InfoDrawerHolder),
      detailPanelStyle: "floating",
      bottomPanel: h(ElevationChart, null),
      contextPanelOpen: contextPanelOpen || inputFocus,
      detailPanelOpen: infoDrawerOpen,
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
        h(Route, {
          path: mapPagePrefix + "/" + page,
          element: h(MapPage, { menuPage: page }),
        })
      )
    ),
    h(Route, { path: "*", element: h(MapPage) }),
  ]);
}

function InfoDrawerHolder() {
  // We could probably do this in the reducer...
  const infoDrawerOpen = useAppState((s) => s.core.infoDrawerOpen);
  const detailPanelTrans = useTransition(infoDrawerOpen, 800);

  return h([
    // This is essentially a shim implementation of React Router
    h(Routes, [
      h(Route, {
        path: mapPagePrefix + "/loc/:lng/:lat/*",
        element: h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
          className: "detail-panel",
        }),
      }),
    ]),
    h(InfoDrawerLocationGrabber),
  ]);
}

function InfoDrawerLocationGrabber() {
  // We could probably do this in the reducer...
  const z = Math.round(
    useAppState((s) => s.core.mapPosition.target?.zoom) ?? 7
  );
  const infoMarkerPosition = useAppState((s) => s.core.infoMarkerPosition);
  const runAction = useAppActions();

  const { lat, lng } = infoMarkerPosition ?? {};

  // Todo: this is a pretty janky way to do state management
  useEffect(() => {
    if (lat == null || lng == null) return;
    runAction({
      type: "run-map-query",
      lat: Number(lat),
      lng: Number(lng),
      z,
      // Focused column or map unit from active layers.
      // This is a bit anachronistic, since we want to be
      // able to show columns that aren't necessarily shown on the map
      columns: [],
      map_id: null,
    });
  }, [lat, lng]);
  return null;
}

export default MapPageRoutes;
