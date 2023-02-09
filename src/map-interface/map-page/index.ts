import { Suspense } from "react";
// Import other components
import hyper from "@macrostrat/hyper";
import Searchbar, { LoaderButton } from "../components/navbar";
import { ButtonGroup, Button, Spinner, Switch } from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";
import { JSONView } from "@macrostrat/ui-components";
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
import { DevMapView, MapBottomControls, MapStyledContainer } from "./map-view";
import { Routes, Route, useParams } from "react-router-dom";
import { MenuPage, PanelCard } from "./menu";
import { useState } from "react";
import { FloatingNavbar } from "../components/navbar";
import { LocationPanel } from "../components/info-drawer";
import { useCallback } from "react";

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

  const contextPanelTrans = useTransition(contextPanelOpen || inputFocus, 800);
  const detailPanelTrans = useTransition(infoDrawerOpen, 800);

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

  if (!loaded) {
    return h(Spinner);
  }

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
              menuPage: menuPage ?? navMenuPage,
            }),
          ]),
          h(MapView, {
            backend,
          }),
          h("div.detail-stack.infodrawer-container", [
            h(Routes, [
              h(Route, {
                path: "/loc/:lng/:lat",
                element: h(InfoDrawerRoute),
              }),
              // h.if(detailPanelTrans.shouldMount)(InfoDrawer, {
              //   className: "detail-panel",
              // }),
            ]),
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

export function DevMapPage({
  headerElement = null,
}: {
  headerElement?: React.ReactElement;
}) {
  // A stripped-down page for map development
  const runAction = useAppActions();
  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */

  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  const [isOpen, setOpen] = useState(false);
  const [showLineSymbols, setShowLineSymbols] = useState(false);
  const isLoading = useAppState((state) => state.core.mapIsLoading);

  const [inspectPosition, setInspectPosition] =
    useState<mapboxgl.LngLat | null>(null);

  const isDetailPanelOpen = inspectPosition !== null;
  const detailPanelTrans = useTransition(isDetailPanelOpen, 800);

  const [data, setData] = useState(null);

  const onSelectPosition = useCallback(
    (
      position: mapboxgl.LngLat,
      event: mapboxgl.MapMouseEvent,
      map: mapboxgl.Map
    ) => {
      setInspectPosition(position);
      let features = null;

      const r = 2;
      const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
        [event.point.x - r, event.point.y - r],
        [event.point.x + r, event.point.y + r],
      ];
      if (position != null) {
        features = map.queryRenderedFeatures(bbox);
      }
      setData(features);
    },
    []
  );

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

  if (!loaded) return h(Spinner);

  return h(
    MapAreaContainer,
    {
      contextElement: h([
        h(FloatingNavbar, { className: "searchbar" }, [
          headerElement,
          h("div.spacer"),
          h(LoaderButton, {
            active: isOpen,
            onClick: () => setOpen(!isOpen),
            isLoading,
          }),
        ]),
        h.if(isOpen)(PanelCard, [
          h(Switch, {
            checked: showLineSymbols,
            label: "Show line symbols",
            onChange() {
              setShowLineSymbols(!showLineSymbols);
            },
          }),
        ]),
      ]),
      detailElement,
    },
    h(DevMapView, {
      showLineSymbols,
      markerPosition: inspectPosition,
      setMarkerPosition: onSelectPosition,
    })
  );
}

type AnyElement = React.ReactNode | React.ReactElement | React.ReactFragment;

function MapAreaContainer({
  children,
  className,
  contextElement,
  detailElement = null,
  detailPanelOpen = true,
  contextPanelOpen = true,
  mapControls = h(MapBottomControls),
}: {
  children?: AnyElement;
  mapControls?: AnyElement;
  contextElement?: AnyElement;
  detailElement?: AnyElement;
  className?: string;
  detailPanelOpen?: boolean;
  contextPanelOpen?: boolean;
}) {
  const _detailPanelOpen = detailPanelOpen || detailElement != null;
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
    h(MapStyledContainer, { className: "map-page map-dev-page" }, [
      h("div.main-ui", { className: _className }, [
        h("div.context-stack", [contextElement]),
        //h(MapView),
        children,
        h("div.detail-stack.infodrawer-container", [
          h.if(detailPanelTrans.shouldMount)([detailElement]),
          h("div.spacer"),
          h(MapBottomControls),
        ]),
      ]),
    ]),
  ]);
}

function FeatureRecord({ feature }) {
  return h("div.feature-record", [
    h("div.feature-record-header", [
      h(KeyValue, { label: "Source", value: feature.source }),
      h(KeyValue, { label: "Layer", value: feature.sourceLayer }),
    ]),
    h(JSONView, { data: feature.properties, hideRoot: true }),
  ]);
}

function KeyValue({ label, value }) {
  return h("span.key-value", [h("span.key", label), h("code.value", value)]);
}

function Features({ features }) {
  return h(
    "div.features",
    features.map((feature) => h(FeatureRecord, { feature }))
  );
}

//const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default MapPageRoutes;
