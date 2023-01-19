import { normalizeLng } from "../../utils";
import { Icon, Button } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import {
  PositionFocusState,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";

const h = hyper.styled(styles);

const metersToFeet = (meters, decimals = 0) => {
  return (meters * 3.28084).toFixed(decimals);
};

function RecenterButton() {
  const runAction = useAppActions();
  const pos =
    useAppState((state) => state.core.infoMarkerFocus) ??
    PositionFocusState.CENTERED;
  let intent = null;
  if (pos == PositionFocusState.OUT_OF_PADDING) {
    intent = "success";
  } else if (pos == PositionFocusState.OUT_OF_VIEW) {
    intent = "warning";
  }

  return h(
    Button,
    {
      minimal: true,
      icon: "map-marker",
      onClick() {
        runAction({ type: "recenter-query-marker" });
      },
      intent,
    },
    pos == PositionFocusState.OUT_OF_VIEW ||
      pos == PositionFocusState.OUT_OF_PADDING
      ? "Recenter"
      : null
  );
}

export function InfoDrawerHeader(props) {
  const { mapInfo, infoMarkerPosition: position, onCloseClick } = props;
  const runAction = useAppActions();
  const { elevation } = mapInfo;
  return h("header", [
    //h("div.left-icon", [h(Icon, { icon: "map-marker" })]),
    h(RecenterButton),
    h("div.spacer"),
    h("div.infodrawer-header", [
      h("div.infodrawer-header-item lnglat-container", [
        h("span.lnglat", [
          normalizeLng(position.lng.toFixed(4)),
          ", ",
          position.lat.toFixed(4),
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
