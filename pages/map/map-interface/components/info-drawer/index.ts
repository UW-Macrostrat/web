import { Route, Routes } from "react-router-dom";
import { LocationPanel } from "@macrostrat/map-interface";
import {
  MacrostratLinkedData,
  RegionalStratigraphy,
} from "./macrostrat-linked";
import { GeologicMapInfo } from "./geo-map";
import { XddExpansionContainer } from "./xdd-panel";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";
import { Physiography } from "./physiography.ts";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";

import h from "./main.module.sass";
import classNames from "classnames";

function InfoDrawer(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  const { className } = props;
  const mapInfo = useAppState((state) => state.core.mapInfo);
  const fetchingMapInfo = useAppState((state) => state.core.fetchingMapInfo);

  const runAction = useAppActions();

  const onClose = useCallback(
    () => runAction({ type: "close-infodrawer" }),
    [runAction]
  );

  const position = useAppState((state) => state.core.infoMarkerPosition);
  const zoom = useAppState((state) => state.core.mapPosition.target?.zoom);
  const columnInfo = useAppState((state) => state.core.columnInfo);

  return h(
    MacrostratInteractionProvider,
    { linkDomain: "/" },
    h(
      LocationPanel,
      {
        className: classNames("info-drawer", className),
        position,
        elevation: mapInfo.elevation,
        zoom,
        onClose,
        loading: fetchingMapInfo,
        showCopyPositionButton: true,
        contentContainer: "div.infodrawer-content-holder",
      },
      h(
        LoadingArea,
        { loaded: !fetchingMapInfo, className: "infodrawer-content" },
        h(Routes, [
          h(Route, {
            path: "/column",
            element: h(StratColumn, { columnInfo }),
          }),
          h(Route, { path: "*", element: h(InfoDrawerMainPanel) }),
        ])
      )
    )
  );
}

function InfoDrawerMainPanel(props) {
  const mapInfo = useAppState((state) => state.core.mapInfo);
  const columnInfo = useAppState((state) => state.core.columnInfo);

  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

  const { mapData } = mapInfo;

  const matchedStratNames = mapData[0]?.macrostrat?.strat_names ?? [];
  const terms = matchedStratNames.map((s) => s.rank_name);

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
    h.if(columnInfo)(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
    }),
    h(MacrostratLinkedData, {
      mapInfo,
      expanded: true,
      source,
      stratNameURL: "/lex/strat-names",
      environmentURL: "/lex/environments",
      intervalURL: "/lex/intervals",
      lithologyURL: "/lex/lithologies",
    }),
    h.if(terms.length > 0)(XddExpansionContainer, { terms }),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
