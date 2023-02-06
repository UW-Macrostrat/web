import { normalizeLng } from "../../utils";
import { Icon, Button } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import {
  PositionFocusState,
  useAppActions,
  useAppState,
} from "~/map-interface/app-state";
import { fmt3 } from "~/map-interface/utils";

const h = hyper.styled(styles);

import { Toaster } from "@blueprintjs/core";

const AppToaster = Toaster.create({
  maxToasts: 1,
});

const metersToFeet = (meters, decimals = 0) => {
  return (meters * 3.28084).toFixed(decimals);
};

function PositionButton() {
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

  const isCentered =
    pos == PositionFocusState.CENTERED || pos == PositionFocusState.NEAR_CENTER;

  return h("div.position-controls", [
    h(
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
    ),
    h.if(isCentered)(
      Button,
      {
        className: "copy-link-button",
        rightIcon: h(Icon, { icon: "link", size: 12 }),
        minimal: true,
        small: true,
        onClick() {
          navigator.clipboard.writeText(window.location.href).then(
            () => {
              AppToaster.show({
                message: "Copied link to position!",
                intent: "success",
                icon: "clipboard",
                timeout: 1000,
              });
            },
            () => {
              AppToaster.show({
                message: "Failed to copy link",
                intent: "danger",
                icon: "error",
                timeout: 1000,
              });
            }
          );
        },
      },
      "Copy link"
    ),
  ]);
}

export function InfoDrawerHeader(props) {
  const { mapInfo, onCloseClick } = props;
  const { elevation } = mapInfo;

  const zoom = useAppState((state) => state.core.mapPosition.target?.zoom);
  const position = useAppState((state) => state.core.infoMarkerPosition);

  return h("header", [
    //h("div.left-icon", [h(Icon, { icon: "map-marker" })]),
    h(PositionButton),
    h("div.spacer"),
    h(LngLatCoords, { position, zoom }),
    h(Elevation, { elevation }),
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
  return h("div.infodrawer-header-item.lnglat-container", [
    h("span.lnglat", [
      h(DegreeCoord, {
        value: fmt3(position.lat),
        labels: ["N", "S"],
      }),
      ", ",

      h(DegreeCoord, {
        value: fmt3(normalizeLng(Number(position.lng))),
        labels: ["E", "W"],
      }),
    ]),
  ]);
}

function Elevation(props) {
  const { elevation } = props;
  if (elevation == null) return null;
  return h("div.infodrawer-header-item.elevation", [
    h(ValueWithUnit, { value: elevation, unit: "m" }),
    h("span.secondary", [
      " (",
      h(ValueWithUnit, { value: metersToFeet(elevation), unit: "ft" }),
      ")",
    ]),
  ]);
}
