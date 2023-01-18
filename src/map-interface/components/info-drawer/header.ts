import { normalizeLng } from "../../utils";
import { Icon, Button } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

const metersToFeet = (meters, decimals = 0) => {
  return (meters * 3.28084).toFixed(decimals);
};

export function InfoDrawerHeader(props) {
  const { mapInfo, infoMarkerPosition, onCloseClick } = props;
  const { elevation } = mapInfo;
  return h("header", [
    h("div.left-icon", [h(Icon, { icon: "map-marker" })]),
    h("div.spacer"),
    h("div.infodrawer-header", [
      h("div.infodrawer-header-item lnglat-container", [
        h("span.lnglat", [
          normalizeLng(infoMarkerPosition.lng.toFixed(4)),
          ", ",
          infoMarkerPosition.lat.toFixed(4),
        ]),
        h(Elevation, { elevation }),
      ]),
    ]),
    h(Button, { minimal: true, icon: "cross", onClick: onCloseClick }),
  ]);
}

function Elevation(props) {
  const { elevation } = props;
  if (elevation == null) return null;
  return h("span.elevation", [
    h("span.z", [elevation]),
    h("span.age-chip-ma", ["m"]),
    " | ",
    metersToFeet(elevation),
    h("span.age-chip-ma", ["ft"]),
  ]);
}
