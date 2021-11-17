import { Card, Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { connect } from "react-redux";
import { closeInfoDrawer, expandInfoDrawer, getColumn } from "../../actions";
import { useAppActions } from "~/map-interface/reducers";

import { InfoDrawerHeader } from "./header";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { GddExpansion } from "./gdd";

function InfoDrawer(props) {
  const {
    mapHasBedrock,
    mapHasColumns,
    mapHasFossils,
    infoDrawerOpen,
    closeInfoDrawer,
    columnInfo,
    ...rest
  } = props;
  let { mapInfo, gddInfo, pbdbData } = rest;
  const runAction = useAppActions();

  const openGdd = () => {
    runAction({ type: "fetch-gdd" });
  };

  if (!mapInfo || !mapInfo.mapData) {
    mapInfo = {
      mapData: [],
    };
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
        onCloseClick: closeInfoDrawer,
      }),
      h("div.overflow-container", [
        h(
          "div",
          { className: rest.fetchingMapInfo ? "infoDrawer-loading" : "hidden" },
          [h(Spinner)]
        ),
        h("div", { className: rest.fetchingMapInfo ? "hidden" : "d" }, [
          h(FossilCollections, { data: pbdbData, expanded: mapHasFossils }),
          h(GeologicMapInfo, {
            mapInfo,
            bedrockExpanded: mapHasBedrock,
            source,
          }),
          h(MacrostratLinkedData, {
            mapInfo,
            bedrockMatchExpanded: false,
            source,
          }),
          h(RegionalStratigraphy, { mapInfo, columnInfo }),
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

const mapDispatchToProps = (dispatch) => {
  return {
    closeInfoDrawer: () => {
      dispatch(closeInfoDrawer());
    },
    expandInfoDrawer: () => {
      dispatch(expandInfoDrawer());
    },
    getColumn: (lng, lat) => {
      dispatch(getColumn(lng, lat)); // not correct
    },
  };
};

const InfoDrawerContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoDrawer);

export default InfoDrawerContainer;
