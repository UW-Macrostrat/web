import { normalizeLng } from "../../utils";
import { Icon, Button } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import {
  PositionFocusState,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";
import { formatCoordForZoomLevel } from "~/map-interface/app-state/helpers";

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
  const { mapInfo, infoMarkerPosition: position, onCloseClick, zoom } = props;
  const { elevation } = mapInfo;
  return h("header", [
    //h("div.left-icon", [h(Icon, { icon: "map-marker" })]),
    h(RecenterButton),
    h("div.spacer"),
    h("div.infodrawer-header", [
      h("div.infodrawer-header-item lnglat-container", [
        h(LngLatCoords, { position, zoom }),
        h(Elevation, { elevation }),
      ]),
    ]),
    h(Button, { minimal: true, icon: "cross", onClick: onCloseClick }),
  ]);
}

function ValueWithUnit(props) {
  const { value, unit } = props;
  return h("span.value-with-unit", [
    h("span.value", [value]),
    h("span.spacer", [" "]),
    h("span.unit", [unit]),
  ]);
}

function DegreeCoord(props) {
  const { value, labels } = props;
  const direction = value < 0 ? labels[1] : labels[0];
  return h(ValueWithUnit, {
    value: Math.abs(value) + "°",
    unit: direction,
  });
}

function LngLatCoords(props) {
  const { position, zoom = 7 } = props;
  return h("span.lnglat-container", [
    h("span.lnglat", [
      h(DegreeCoord, {
        value: formatCoordForZoomLevel(position.lat, zoom),
        labels: ["N", "S"],
      }),
      ", ",

      h(DegreeCoord, {
        value: formatCoordForZoomLevel(
          normalizeLng(Number(position.lng)),
          zoom
        ),
        labels: ["E", "W"],
      }),
    ]),
  ]);
}

function Elevation(props) {
  const { elevation } = props;
  if (elevation == null) return null;
  return h("span.elevation", [
    h(ValueWithUnit, { value: elevation, unit: "m" }),
    h("span.secondary", [
      " (",
      h(ValueWithUnit, { value: metersToFeet(elevation), unit: "ft" }),
      ")",
    ]),
  ]);
}
