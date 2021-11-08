import React from "react";
import { normalizeLng } from "../../utils";
import { Icon, Button } from "@blueprintjs/core";
import h from "@macrostrat/hyper";

const metersToFeet = (meters, decimals = 0) => {
  return (meters * 3.28084).toFixed(decimals);
};

export function InfoDrawerHeader(props) {
  const { mapInfo, infoMarkerLat, infoMarkerLng, onCloseClick } = props;
  const { elevation } = mapInfo;
  if (!elevation) return "";
  return h("header", [
    h("div", [
      h(Icon, { icon: "map-marker" }),
      h("div.infodrawer-header", [
        h("div.infodrawer-header-item lnglat-container", [
          h("span.lnglat", [normalizeLng(infoMarkerLng), ", ", infoMarkerLat]),
          h("span.z", [elevation]),
          h("span.age-chip-ma", ["m"]),
          " | ",
          metersToFeet(elevation),
          h("span.age-chip-ma", ["ft"]),
        ]),
      ]),
    ]),
    h(Button, { minimal: true, icon: "cross", onClick: onCloseClick }),
  ]);
}
