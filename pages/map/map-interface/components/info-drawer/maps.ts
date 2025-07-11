import hyper from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { useAppActions } from "#/map/map-interface/app-state";
import { LocationPanel } from "@macrostrat/map-interface";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { XddExpansion } from "./xdd-panel";
import { useAppState } from "#/map/map-interface/app-state";
import styles from "./main.module.styl";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";

const h = hyper.styled(styles);

function InfoDrawer(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  const { className, mapInfo, fetchingMapInfo, position, zoom } = props;

  return h(
    LocationPanel,
    {
      className,
      position,
      elevation: mapInfo?.elevation,
      zoom,
      loading: fetchingMapInfo,
      showCopyPositionButton: true,
      contentContainer: "div.infodrawer-content-holder",
    },
    [
      h(
        LoadingArea,
        { loaded: !fetchingMapInfo, className: "infodrawer-content" },
        h.if(!fetchingMapInfo)(InfoDrawerInterior, {mapInfo})
      ),
    ]
  );
}

function InfoDrawerInterior(props) {
  const { mapInfo } = props;
  return h(InfoDrawerMainPanel, { mapInfo });
}

function InfoDrawerMainPanel({mapInfo, columnInfo, pbdbData}) {
  if (!mapInfo || !mapInfo.mapData) {
    return null;
  }

  console.log('GOT TO MAIN PANEL');


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
    /*
    h(GeologicMapInfo, {
      mapInfo,
      bedrockExpanded: true,
      source,
    }),
    h(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
    }),
    */
    // h(FossilCollections, { data: pbdbData, expanded: true }),
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
