import { ReactChild } from "react";
import { Card, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
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
import { useNavigate } from "react-router";
import { routerBasename } from "~/map-interface/Settings";

const h = hyper.styled(styles);

function InfoDrawerContainer(props) {
  return h(Card, { className: "infodrawer", ...props });
}

function InfoDrawer(props) {
  // We used to enable panels when certain layers were on,
  // but now we just show all panels always
  let { className } = props;
  const { mapInfo, fetchingMapInfo, infoMarkerPosition } = useAppState(
    (state) => state.core
  );

  const navigate = useNavigate();

  className = classNames("infodrawer", className, {
    loading: fetchingMapInfo,
  });

  return h(Card, { className }, [
    h(InfoDrawerHeader, {
      mapInfo,
      infoMarkerPosition,
      onCloseClick: () => navigate(routerBasename),
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

function InfoDrawerInterior(props) {
  const { mapInfo, fetchingGdd, columnInfo, gddInfo, pbdbData } = useAppState(
    (state) => state.core
  );

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
