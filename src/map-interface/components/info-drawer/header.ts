import { Icon, Button, Intent } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import { CopyLinkButton } from "@macrostrat/map-interface/src/location-panel/buttons";
import {
  LngLatCoords,
  Elevation,
} from "@macrostrat/map-interface/src/location-info";
import {
  LocationFocusButton,
  useFocusState,
  isCentered,
} from "@macrostrat/mapbox-react";

const h = hyper.styled(styles);

function PositionButton({ position }) {
  const focusState = useFocusState(position);

  return h("div.position-controls", [
    h(LocationFocusButton, { location: position, focusState }, []),
    isCentered(focusState) ? h(CopyLinkButton, { itemName: "position" }) : null,
  ]);
}

interface InfoDrawerHeaderProps {
  onClose: () => void;
  position: mapboxgl.LngLat;
  zoom?: number;
  elevation?: number;
}

export function InfoDrawerHeader(props: InfoDrawerHeaderProps) {
  const { onClose, position, zoom = 7, elevation } = props;

  return h("header.location-panel-header", [
    //h("div.left-icon", [h(Icon, { icon: "map-marker" })]),
    h(PositionButton, { position }),
    h("div.spacer"),
    h(LngLatCoords, { position, zoom, className: "infodrawer-header-item" }),
    h.if(elevation != null)(Elevation, {
      elevation,
      className: "infodrawer-header-item",
    }),
    h(Button, { minimal: true, icon: "cross", onClick: onClose }),
  ]);
}
