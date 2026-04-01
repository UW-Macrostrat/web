import { Suspense, useCallback, useEffect, useRef } from "react";
// Import other components
import { Spinner, Icon } from "@blueprintjs/core";
import loadable from "@loadable/component";
import { apiV2Prefix, mapPagePrefix } from "@macrostrat-web/settings";
import { MapAreaContainer, FossilCollections } from "@macrostrat/map-interface";
import classNames from "classnames";
import { useSelector } from "react-redux";
import { useTransition } from "transition-hook";
import {
  useAppActions,
  useAppState,
  useContextClass,
  useContextPanelOpen,
} from "../app-state";
import Searchbar from "../components/navbar";
import MapContainer from "./map-view";
import { MenuPage } from "./menu";
import { ErrorBoundary, FlexRow } from "@macrostrat/ui-components";

import h from "./main.module.sass";
import { MacrostratDataProvider } from "@macrostrat/data-provider";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const Menu = loadable(() => import("./menu"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));

function MapView(props) {
  return h(
    Suspense,
    { fallback: h("div.map-view-placeholder") },
    h(MapContainer, props)
  );
}

function useSingleEffect(callback, dependencies) {
  /** Use an effect that is guaranteed to be called only once per page.
   * This is probably  hack for better state management */
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      callback();
    }
  }, dependencies);
}

function MapPage({
  baseRoute = "/",
  menuPage = null,
}: {
  baseRoute?: string;
  menuPage?: MenuPage;
}) {
  const runAction = useAppActions();
  const inputFocus = useAppState((s) => s.inputFocus);
  const infoDrawerOpen = useAppState((s) => s.infoDrawerOpen);
  const navMenuPage = useAppState((s) => s.activeMenuPage);

  const ref = useRef<HTMLElement>(null);
  //const [map, setMap] = useState(null);
  //console.log("MapPage mounted", map);

  const contextPanelOpen = useContextPanelOpen(baseRoute);
  const contextClass = useContextClass(baseRoute);

  const loaded = useSelector((state) => state.initialLoadComplete);
  useSingleEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const onMouseDown = useCallback(
    (event) => {
      if (!(inputFocus || contextPanelOpen)) return;
      if (ref.current?.contains(event.target)) return;
      console.log("Clicked outside context");
      runAction({ type: "context-outside-click" });
      event.stopPropagation();
    },
    [inputFocus, contextPanelOpen]
  );

  if (!loaded) {
    return h(Spinner);
  }

  return h(
    ErrorBoundary,
    h(
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
    )
  );
}

function MapPageRoutes({ menuPage = null }) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(MapPage, { menuPage })
  );
}

function InfoDrawerHolder() {
  // We could probably do this in the reducer...
  const infoDrawerOpen = useAppState((s) => s.infoDrawerOpen);
  const detailPanelTrans = useTransition(infoDrawerOpen, 800);
  const position = useAppState((state) => state.infoMarkerPosition);
  const zoom = useAppState((state) => state.mapPosition.target?.zoom);

  // For fossil click
  const pbdbData = useAppState((state) => state.pbdbData);
  const runAction = useAppActions();

  const onClose = useCallback(
    () => runAction({ type: "close-infodrawer" }),
    [runAction]
  );

  if (pbdbData && pbdbData.length > 0) {
    return h("div.fossil-container", [
      h(FlexRow, { justifyContent: "space-between" }, [
        h("h2.title", "Fossil Collections (via PBDB)"),
        h(Icon, { icon: "cross", onClick: onClose, className: "close-icon" }),
      ]),
      h("div.collections", [
        h(FossilCollections, { data: pbdbData, expanded: true }),
      ]),
    ]);
  }

  return h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
    position,
    zoom,
  });

  // return h([
  //   // This is essentially a shim implementation of React Router
  //   h(Routes, [
  //     h(Route, {
  //       path: mapPagePrefix + "/loc/:lng/:lat/*",
  //       element: h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
  //         position,
  //         zoom,
  //       }),
  //     }),
  //   ]),
  //   //h(InfoDrawerLocationGrabber),
  // ]);
}

export default MapPageRoutes;
