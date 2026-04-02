import { LocationPanel } from "@macrostrat/map-interface";
import { RegionalStratigraphy } from "./macrostrat-linked";
import { GeologicMapInfo } from "./geo-map";
import { XddExpansionContainer } from "./xdd-panel";
import { useAppActions, useAppState } from "../../app-state";
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
  const { className, isShowingColumnPage = false } = props;
  const mapInfo = useAppState((state) => state.mapInfo);
  const fetchingMapInfo = useAppState((state) => state.fetchingMapInfo);

  const runAction = useAppActions();

  const onClose = useCallback(
    () => runAction({ type: "close-infodrawer" }),
    [runAction]
  );

  const position = useAppState((state) => state.infoMarkerPosition);
  const zoom = useAppState((state) => state.mapPosition.target?.zoom);
  const columnInfo = useAppState((state) => state.columnInfo);

  let content = null;
  if (isShowingColumnPage) {
    content = h(StratColumn, { columnInfo });
  } else {
    content = h(InfoDrawerMainPanel);
  }

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
        content
      )
    )
  );
}

function InfoDrawerMainPanel(props) {
  const mapInfo = useAppState((state) => state.mapInfo);
  const columnInfo = useAppState((state) => state.columnInfo);

  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

  const { mapData } = mapInfo;

  const matchedStratNames = mapData?.[0]?.macrostrat?.strat_names ?? [];
  const terms = matchedStratNames.map((s) => s.rank_name);

  let source = mapData?.[0] ?? {
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
    h.if(columnInfo != null)(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
      source,
      expanded: true,
    }),
    h.if(terms.length > 0)(XddExpansionContainer, { terms }),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
