import hyper from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { useAppActions } from "#/map/map-interface/app-state";
import { LocationPanel } from "@macrostrat/map-interface";
import { FossilCollections } from "./fossil-collections";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { Physiography } from "./physiography";
import { useAppState } from "#/map/map-interface/app-state";
import styles from "./main.module.styl";
import { LoadingArea } from "../transitions";
import { StratColumn } from "./strat-column";
import { useCallback } from "react";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { addCommas } from "#/map/map-interface/utils";
import { XddExpansion2 } from "./xdd-panel";


const h = hyper.styled(styles);

function InfoDrawer(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  const { xddInfo, className, mapInfo, columnInfo, fetchingMapInfo, position, zoom, setSelectedLocation } = props;

  return h(
    LocationPanel,
    {
      className,
      position,
      elevation: mapInfo?.elevation,
      zoom,
      onClose: () => setSelectedLocation(null),
      loading: fetchingMapInfo,
      showCopyPositionButton: true,
      contentContainer: "div.infodrawer-content-holder",
    },
    [
      h(
        LoadingArea,
        { loaded: !fetchingMapInfo, className: "infodrawer-content" },
        h.if(!fetchingMapInfo)(InfoDrawerInterior, {mapInfo, columnInfo, xddInfo})
      ),
    ]
  );
}

function InfoDrawerInterior(props) {
  const { mapInfo, columnInfo, xddInfo } = props;
  return h(InfoDrawerMainPanel, { mapInfo, columnInfo, xddInfo });
}

function InfoDrawerMainPanel({mapInfo, columnInfo, xddInfo}) {
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
    h(RegionalStratigraphy, {
      mapInfo,
      columnInfo,
    }),
    // h(FossilCollections, { data: pbdbData, expanded: true }),
    h(MacrostratLinkedData, {
      mapInfo,
      bedrockMatchExpanded: true,
      source,
    }),
    h.if(xddInfo)(XddExpansion2, {xddInfo}),
    h(Physiography, { mapInfo }),
  ]);
}

export default InfoDrawer;

function RegionalStratigraphy(props) {
  const { mapInfo, columnInfo } = props;
  if (mapInfo?.mapData == null || !columnInfo) return null;

  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Regional stratigraphy",
      expanded: true,
    },
    [
      h.if(columnInfo != null)(ColumnData, { columnInfo }),
    ]
  );
}

function ColumnData({ columnInfo }) {
  return h("div.column-data", [
    h('a', { href: '/columns/' + columnInfo.col_id }, "View column page"),
    h(MapAttribute, {
      label: "Name: ",
      content: [columnInfo.col_name],
    }),
    h(MapAttribute, {
      label: "Column ID: ",
      content: [columnInfo.col_id],
    }),
    h(MapAttribute, {
      label: "Group: ",
      content: [columnInfo.col_group],
    }),
    h(MapAttribute, {
      label: "Group ID: ",
      content: [columnInfo.col_group_id],
    }),
    h.if(columnInfo.min_min_thick || columnInfo.max_thick)(MapAttribute, {
      label: "Thickness: ",
      content: [
        addCommas(parseInt(columnInfo.min_min_thick)),
        " - ",
        addCommas(parseInt(columnInfo.max_thick)),
        h("span.age-ma", ["m"]),
      ],
    }),
    h(MapAttribute, {
      label: "Age: ",
      content: [
        columnInfo.b_age,
        " - ",
        columnInfo.t_age,
        " ",
        h("span.age-ma", ["Ma"]),
      ],
    }),
    h(MapAttribute, {
      label: "Area: ",
      content: [addCommas(columnInfo.col_area), " ", h("span.age-ma", ["km2"])],
    }),
    h(MapAttribute, {
      label: "Fossil collections: ",
      content: [addCommas(columnInfo.pbdb_collections)],
    }),
  ]);
}

function MapAttribute(props) {
  return h("div.map-source-attr", [
    h("span.attr", [props.label]),
    ...props.content,
  ]);
}