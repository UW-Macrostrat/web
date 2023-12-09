import { Suspense, useEffect, useCallback, useRef } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar from "../components/navbar";
import { Spinner } from "@blueprintjs/core";
import { useSelector } from "react-redux";
import loadable from "@loadable/component";
import { useAppState, useAppActions } from "../app-state";
import styles from "./main.module.styl";
import { useTransition } from "transition-hook";
import { useContextPanelOpen, useContextClass } from "../app-state";
import { MapAreaContainer } from "@macrostrat/map-interface";
import { Routes, Route, useParams } from "react-router-dom";
import classNames from "classnames";
import { MenuPage } from "./menu";
import { mapPagePrefix } from "~/settings";
import MapContainer from "./map-view";
import DevIndex from "../../../../dev";

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
  const inPaleoMode = useAppState((s) => s.core.timeCursorAge != null);

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
      detailPanel: h(Routes, [
        h(Route, {
          path: mapPagePrefix + "/loc/:lng/:lat/*",
          element: h(InfoDrawerRoute),
        }),
      ]),
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
    h(Route, { path: mapPagePrefix + "/dev/*", element: h(DevIndex) }),
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

  // Todo: this is a pretty janky way to do state management
  useEffect(() => {
    if (lat && lng) {
      console.log("Updating infomarker position");
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

export { MapAreaContainer };
export default MapPageRoutes;
