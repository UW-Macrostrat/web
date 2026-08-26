import { Suspense, useCallback, useEffect, useRef } from "react";
// Import other components
import { Spinner, Icon } from "@blueprintjs/core";
import loadable from "@loadable/component";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { MapAreaContainer, FossilCollections } from "@macrostrat/map-interface";
import classNames from "classnames";
import { useTransition } from "transition-hook";
import {
  browserHistory,
  useAppActions,
  useAppState,
  useContextClass,
  useContextPanelOpen,
} from "../app-state";
import { hashHasMapPosition } from "../app-state/hash-string";
import { readLastMapPosition } from "~/_utils/last-map-position";
import { getMapPositionForHash } from "@macrostrat/map-interface";
import { usePageContext } from "vike-react/usePageContext";
import { MapPageNavbar } from "./navbar";
import MapContainer from "./map-view";
import { MenuPage } from "./menu";
import { ErrorBoundary, FlexRow } from "@macrostrat/ui-components";

import h from "./main.module.sass";
import {
  MacrostratDataProvider,
  useMacrostratDefs,
} from "@macrostrat/data-provider";
import InfoDrawer from "../components/info-drawer";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const Menu = loadable(() => import("./menu"));

function MapView(props) {
  return h(
    Suspense,
    { fallback: h("div.map-view-placeholder") },
    h(MapContainer, props)
  );
}

function useSingleEffect(callback, dependencies) {
  /** Use an effect that is guaranteed to be called only once per page.
   * This is a hack for better state management */
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      callback();
    }
  }, dependencies);
}

/** Ordered-sinks resolver, part 2 (GeoIP). Centers the map on the server-derived
 * GeoIP default, but ONLY when neither the URL nor a stored last-viewed position
 * applies — it ranks below both. (Part 1, last-viewed, is handled at store
 * creation in `createInitialState`.) Runs once at mount, since `pageContext.geo`
 * isn't available synchronously when the store is first built. */
function applyGeoDefault(geo, runAction) {
  if (geo == null) return;
  if (hashHasMapPosition(browserHistory.location.hash)) return;
  if (readLastMapPosition() != null) return;
  runAction({
    type: "map-moved",
    data: {
      mapPosition: getMapPositionForHash(
        { x: String(geo.lng), y: String(geo.lat), z: String(geo.zoom) },
        { lng: geo.lng, lat: geo.lat }
      ),
    },
  });
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

  const contextPanelOpen = useContextPanelOpen(baseRoute);
  const contextClass = useContextClass(baseRoute);
  const loaded = useAppState((s) => s.initialLoadComplete);

  const geo = usePageContext()?.geo;

  useSingleEffect(() => {
    runAction({ type: "get-initial-map-state" });
    applyGeoDefault(geo, runAction);
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
    ErrorBoundary,
    h(
      MapAreaContainer,
      {
        navbar: h(MapPageNavbar),
        contextPanel: h(Menu, {
          className: "context-panel",
          menuPage: navMenuPage,
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

  if (!infoDrawerOpen) return null;

  return h(InfoDrawer);

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
