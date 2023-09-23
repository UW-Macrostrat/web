import { Suspense, useEffect, useRef } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar from "../components/navbar";
import { Spinner, Button, Switch } from "@blueprintjs/core";
import { useSelector } from "react-redux";
import loadable from "@loadable/component";
import { MapBackend, useAppState, useAppActions } from "../app-state";
import styles from "./main.module.styl";
import { useRef, useEffect, useCallback } from "react";
import { useTransition } from "transition-hook";
import { useContextPanelOpen, useContextClass } from "../app-state";
import { MapAreaContainer } from "@macrostrat/map-interface";
import { Routes, Route, useParams } from "react-router-dom";
import classNames from "classnames";
import { TimescalePanel } from "../paleo";
import { MenuPage, PanelCard } from "./menu";
import { mapPagePrefix } from "../settings";
import MapContainer from "./map-view";
import { useState } from "react";
import { LinkButton } from "../components/buttons";
import {
  FloatingNavbar,
  LoadingButton,
  LocationPanel,
} from "@macrostrat/map-interface";

const ElevationChart = loadable(() => import("../components/elevation-chart"));
const InfoDrawer = loadable(() => import("../components/info-drawer"));
const Menu = loadable(() => import("./menu"));

const h = hyper.styled(styles);

const CesiumViewMod = loadable(() => import("./cesium-view"));
export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

function MapView(props) {
  return h(
    Suspense,
    { fallback: h("div.map-view-placeholder") },
    h(MapContainer, props)
  );
}

export const MapPage = ({
  backend = MapBackend.MAPBOX3,
  baseRoute = "/",
  menuPage = null,
}: {
  backend?: MapBackend;
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
          path: mapPagePrefix + "/loc/:lng/:lat/*",
          element: h(InfoDrawerRoute),
        }),
      ]),

      bottomPanel,
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
          h(LoadingButton, {
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
