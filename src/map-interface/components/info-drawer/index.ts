import { Card, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { connect } from "react-redux";
import { useAppActions } from "~/map-interface/reducers";

import { InfoDrawerHeader } from "./header";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { GddExpansion } from "./gdd";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

function InfoDrawer(props) {
  const {
    mapHasBedrock,
    mapHasColumns,
    mapHasFossils,
    infoDrawerOpen,
    columnInfo,
    ...rest
  } = props;
  let { mapInfo, gddInfo, pbdbData } = rest;
  const runAction = useAppActions();

  const openGdd = () => {
    runAction({ type: "fetch-gdd" });
  };

  if (!mapInfo || !mapInfo.mapData) {
    return h("div");
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

  if (!infoDrawerOpen) {
    return null;
  }
  return h("div.infodrawer-container", [
    h(Card, { className: "infodrawer" }, [
      h(InfoDrawerHeader, {
        mapInfo,
        infoMarkerLng: rest.infoMarkerLng,
        infoMarkerLat: rest.infoMarkerLat,
        onCloseClick: () => runAction({ type: "close-infodrawer" }),
      }),
      h("div.infodrawer-body", [
        h.if(rest.fetchingMapInfo)("div.spinner", [h(Spinner)]),
        h.if(!rest.fetchingMapInfo)("div", [
          h(FossilCollections, { data: pbdbData, expanded: mapHasFossils }),
          h(RegionalStratigraphy, { mapInfo, columnInfo }),
          h(GeologicMapInfo, {
            mapInfo,
            bedrockExpanded: mapHasBedrock,
            source,
          }),
          h(MacrostratLinkedData, {
            mapInfo,
            bedrockMatchExpanded: mapHasBedrock,
            source,
          }),
          h(Physiography, { mapInfo }),
          h(GddExpansion, {
            mapInfo,
            gddInfo,
            openGdd,
            fetchingGdd: rest.fetchingGdd,
          }),
        ]),
      ]),
    ]),
    h("div.spacer"),
  ]);
}

const mapStateToProps = (state) => {
  return {
    infoDrawerOpen: state.update.infoDrawerOpen,
    infoDrawerExpanded: state.update.infoDrawerExpanded,
    mapInfo: state.update.mapInfo,
    fetchingMapInfo: state.update.fetchingMapInfo,
    fetchingColumnInfo: state.update.fectchingColumnInfo,
    fetchingGdd: state.update.fetchingGdd,
    columnInfo: state.update.columnInfo,
    infoMarkerLng: state.update.infoMarkerLng,
    infoMarkerLat: state.update.infoMarkerLat,
    gddInfo: state.update.gddInfo,
    fetchingPbdb: state.update.fetchingPbdb,
    pbdbData: state.update.pbdbData,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
  };
};

const InfoDrawerContainer = connect(mapStateToProps)(InfoDrawer);

export default InfoDrawerContainer;
