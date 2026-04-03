import { LocationPanel } from "@macrostrat/map-interface";
import { RegionalStratigraphy } from "./macrostrat-linked";
import { GeologicMapInfo } from "./geo-map";
import { XddExpansionContainer } from "./xdd-panel";
import {
  infoMarkerPositionAtom,
  mapZoomAtom,
  useAppActions,
  useAppState,
} from "../../app-state";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback, useEffect } from "react";
import { Physiography } from "./physiography.ts";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";

import h from "./main.module.sass";
import classNames from "classnames";
import { mapInfoAtom } from "../../app-state";
import { useAtomValue, atom } from "jotai";
import { useAtomDevtools } from "jotai-devtools";

const loadingAtom = atom((get) => get(mapInfoAtom).state == "loading");
const mapInfoDataAtom = atom((get) => {
  const mapInfoRes = get(mapInfoAtom);
  console.log("mapInfoDataAtom", mapInfoRes.state, mapInfoRes.data);
  return mapInfoRes.data;
});

const elevationAtom = atom<number | null>((get) => {
  const mapInfoData = get(mapInfoDataAtom);
  return mapInfoData?.elevation;
});

function InfoDrawer({ className }) {
  return h(
    MacrostratInteractionProvider,
    { linkDomain: "/" },
    h(InfoDrawerInner, { className })
  );
}

function InfoDrawerInner(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  const { className } = props;

  useAtomDevtools(mapInfoAtom);

  const mapInfo = useAtomValue(mapInfoDataAtom);
  useEffect(() => {
    console.log("mapInfo changed", mapInfo);
  }, [mapInfo]);

  const loading = useAtomValue(loadingAtom);
  const elevation = useAtomValue(elevationAtom);

  const runAction = useAppActions();

  const onClose = useCallback(
    () => runAction({ type: "close-infodrawer" }),
    [runAction]
  );

  const position = useAppState((state) => state.infoMarkerPosition);
  const zoom = useAppState((state) => state.mapPosition.target?.zoom);

  /** Clicking near edmondton at scale small never loads */

  return h(
    LocationPanel,
    {
      className: classNames("info-drawer", className),
      position,
      elevation,
      zoom,
      onClose,
      loading,
      showCopyPositionButton: true,
      contentContainer: "div.infodrawer-content-holder",
    },
    h(
      LoadingArea,
      { loading, className: "infodrawer-content" },
      h(InfoDrawerContent)
    )
  );
}

function InfoDrawerContent() {
  const isShowingColumnPage = useAppState((state) => state.isShowingColumnPage);
  const columnInfo = useAppState((state) => state.columnInfo);
  const mapInfo = useAtomValue(mapInfoDataAtom);

  if (isShowingColumnPage) {
    return h(StratColumn, { columnInfo });
  } else {
    return h(InfoDrawerMainPanel, { mapInfo, columnInfo });
  }
}

function InfoDrawerMainPanel({ mapInfo, columnInfo }) {
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

  return h("div.info-drawer-main-panel", [
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
