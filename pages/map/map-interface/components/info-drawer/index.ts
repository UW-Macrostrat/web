import hyper from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { useAppActions } from "#/map/map-interface/app-state";
import { 
  LocationPanel, 
  FossilCollections, 
  MacrostratLinkedData,
  Physiography,
} from "@macrostrat/map-interface";
import { GeologicMapInfo } from "./geo-map";
import { XddExpansionContainer } from "./xdd-panel";
import { useAppState } from "#/map/map-interface/app-state";
import styles from "./main.module.styl";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { RegionalStratigraphy } from "./reg-strat";

const h = hyper.styled(styles);

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
      showCopyPositionButton: true,
      contentContainer: "div.infodrawer-content-holder",
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
  return h(Routes, [
    h(Route, { path: "/column", element: h(StratColumn, { columnInfo }) }),
    //update view locations route
    h(Route, { path: "/locations", element: h("div", "hello world") }),

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

  const columnURL = usePageContext().urlPathname + "/column"

  return h([
    h(GeologicMapInfo, {
      mapInfo,
      bedrockExpanded: true,
      source,
    }),
    h(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
      columnURL
    }),
    h(FossilCollections, { data: pbdbData, expanded: false }),
    h(MacrostratLinkedData, {
      mapInfo,
      expanded: true,
      source,
      stratNameURL: "/lex/strat-names",
      environmentURL: "/lex/environments",
      intervalURL: "/lex/intervals",
      lithologyURL: "/lex/lithologies"
    }),
    h.if(mapData[0] && mapData[0].strat_name.length)(XddExpansionContainer),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;
