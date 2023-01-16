import { ReactChild } from "react";
import { Card, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAppActions } from "~/map-interface/app-state";
import { InfoDrawerHeader } from "./header";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { GddExpansion } from "./gdd";
import { useAppState } from "~/map-interface/app-state";
import classNames from "classnames";
import styles from "./main.module.styl";
import { LoadingArea } from "../transitions";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { StratColumn } from "./strat-column";

const h = hyper.styled(styles);

function InfoDrawerContainer(props) {
  return h(Card, { className: "infodrawer", ...props });
}

function InfoDrawer(props) {
  let { className } = props;
  const { mapInfo, fetchingMapInfo, infoMarkerLng, infoMarkerLat } =
    useAppState((state) => state.core);

  const runAction = useAppActions();

  className = classNames("infodrawer", className, {
    loading: fetchingMapInfo,
  });

  return h(Card, { className }, [
    h(InfoDrawerHeader, {
      mapInfo,
      infoMarkerLng,
      infoMarkerLat,
      onCloseClick: () => runAction({ type: "close-infodrawer" }),
    }),
    h("div.infodrawer-body", [
      h(ErrorBoundary, [
        h(
          LoadingArea,
          { loaded: !fetchingMapInfo },
          h.if(!fetchingMapInfo)(InfoDrawerInterior)
        ),
      ]),
    ]),
  ]);
}

function InfoDrawerInterior() {
  const {
    mapInfo,
    fetchingGdd,
    columnInfo,
    gddInfo,
    pbdbData,
    // We used to enable panels when certain layers were on,
    // but now we just show all panels always
    //mapLayers
    // mapHasBedrock,
    // mapHasSatellite,
    // mapHasColumns,
    // mapHasFossils,
  } = useAppState((state) => state.core);

  const params = useParams();

  const runAction = useAppActions();

  const openGdd = () => {
    runAction({ type: "fetch-gdd" });
  };

  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

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

  // if (col_id != null && mapInfo.hasColumns) {
  //   return h(Navigate, { to: `column/${col_id}` });
  // }
  return h(Routes, [
    h(Route, { path: "*", element: h(InfoDrawerCoreInfo) }),
    h(Route, {
      path: "column/:col_id",
      element: h(StratColumnRoute, { currentColID: columnInfo?.col_id }),
    }),
  ]);
}

function StratColumnRoute({ currentColID }) {
  const { col_id } = useParams();

  if (col_id != currentColID) {
    // We are at the incorrect column route
    return h(Navigate, { to: `/column/${col_id}` });
  }

  return h(StratColumn, { col_id });
}

function InfoDrawerCoreInfo() {
  const {
    mapInfo,
    fetchingGdd,
    columnInfo,
    gddInfo,
    pbdbData,
    // We used to enable panels when certain layers were on,
    // but now we just show all panels always
    //mapLayers
    // mapHasBedrock,
    // mapHasSatellite,
    // mapHasColumns,
    // mapHasFossils,
  } = useAppState((state) => state.core);

  const runAction = useAppActions();

  const openGdd = () => {
    runAction({ type: "fetch-gdd" });
  };

  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

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

  return h("div", [
    h(FossilCollections, { data: pbdbData, expanded: true }),
    h(RegionalStratigraphy, { mapInfo, columnInfo }),
    h(GeologicMapInfo, {
      mapInfo,
      bedrockExpanded: true,
      source,
    }),
    h(MacrostratLinkedData, {
      mapInfo,
      bedrockMatchExpanded: true,
      source,
    }),
    h(GddExpansion, {
      mapInfo,
      gddInfo,
      openGdd,
      fetchingGdd,
    }),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
export { InfoDrawerContainer };
