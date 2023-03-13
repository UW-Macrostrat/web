import hyper from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { MapLayer, useAppActions } from "~/pages/map/map-interface/app-state";
import { LocationPanel } from "@macrostrat/map-interface";
import { LocationHeader, InfoDrawerHeader } from "./header";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { XddExpansion } from "./xdd-panel";
import { useAppState } from "~/pages/map/map-interface/app-state";
import styles from "./main.module.styl";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";

const h = hyper.styled(styles);

function InfoDrawerContainer(props) {
  const className = classNames("infodrawer", props.className);
  return h(Card, { ...props, className });
}

export function BaseInfoDrawer(props) {
  const { className, headerElement = null, title, onClose, children } = props;
  const header =
    headerElement ??
    h(InfoDrawerHeader, { onClose }, [title == null ? null : h("h3", [title])]);
  return h(InfoDrawerContainer, { className }, [
    header,
    h("div.infodrawer-body", [h(ErrorBoundary, null, children)]),
  ]);
}

export function LocationPanel(props) {
  const { children, className, ...rest } = props;
  const cls = classNames("location-panel", className);
  return h(
    BaseInfoDrawer,
    { className: cls, headerElement: h(LocationHeader, rest) },
    children
  );
}

function InfoDrawer(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  let { className } = props;
  const mapInfo = useAppState((state) => state.core.mapInfo);
  const fetchingMapInfo = useAppState((state) => state.core.fetchingMapInfo);

  const runAction = useAppActions();

  const onClose = useCallback(
    () => runAction({ type: "close-infodrawer" }),
    [runAction]
  );

  const position = useAppState((state) => state.core.infoMarkerPosition);
  const zoom = useAppState((state) => state.core.mapPosition.target?.zoom);

  return h(
    LocationPanel,
    {
      className,
      position,
      elevation: mapInfo.elevation,
      zoom,
      onClose,
      loading: fetchingMapInfo,
    },
    [
      h(
        LoadingArea,
        { loaded: !fetchingMapInfo, className: "infodrawer-content" },
        h.if(!fetchingMapInfo)(InfoDrawerInterior)
      ),
    ]
  );
}

function InfoDrawerInterior(props) {
  const columnInfo = useAppState((state) => state.core.columnInfo);
  console.log("Column info", columnInfo);

  return h(Routes, [
    h(Route, { path: "/column", element: h(StratColumn, { columnInfo }) }),
    h(Route, { path: "*", element: h(InfoDrawerMainPanel) }),
  ]);
}

function InfoDrawerMainPanel(props) {
  const mapInfo = useAppState((state) => state.core.mapInfo);
  const pbdbData = useAppState((state) => state.core.pbdbData);
  const columnInfo = useAppState((state) => state.core.columnInfo);

  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

  const { mapData } = mapInfo;

  let source =
    mapInfo && mapInfo.mapData && mapInfo.mapData.length
      ? mapInfo.mapData[0]
      : {
          name: null,
          descrip: null,
          comments: null,
          liths: [],
          b_int: {},
          t_int: {},
          ref: {},
        };

  return h([
    h(GeologicMapInfo, {
      mapInfo,
      bedrockExpanded: true,
      source,
    }),
    h(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
    }),
    h(FossilCollections, { data: pbdbData, expanded: true }),
    h(MacrostratLinkedData, {
      mapInfo,
      bedrockMatchExpanded: true,
      source,
    }),
    h.if(mapData[0] && mapData[0].strat_name.length)(XddExpansion),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
