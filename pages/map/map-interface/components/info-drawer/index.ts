import { LocationPanel } from "@macrostrat/map-interface";
import { RegionalStratigraphy } from "./macrostrat-linked";
import { GeologicMapInfo } from "./geo-map";
import { XddExpansionContainer } from "./xdd-panel";
import {
  selectedColumnMetadataAtom,
  useAppActions,
  useAppState,
} from "../../app-state";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";
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

  const mapInfo = useAtomValue(mapInfoAtom);

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
  const { data: mapInfo, state: mapInfoState } = useAtomValue(mapInfoAtom);
  const columnInfo = useAtomValue(selectedColumnMetadataAtom);

  const loading = mapInfoState === "loading";

  if (isShowingColumnPage) {
    return h(StratColumn, { columnInfo });
  } else {
    return h(InfoDrawerMainPanel, {
      mapInfo,
      columnInfo,
      loading,
    });
  }
}

function InfoDrawerMainPanel({ mapInfo, columnInfo, loading }) {
  if (mapInfo == null) return null;
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
      loading,
      source,
      expanded: true,
    }),
    // Found the culprit!
    h.if(terms.length > 0)(XddExpansionContainer, { terms }),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
