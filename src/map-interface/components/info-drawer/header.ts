import { Icon, Button, Intent } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import { useAppState } from "~/map-interface/app-state";
import { useMapRef } from "@macrostrat/mapbox-react";
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

import { Toaster } from "@blueprintjs/core";

const AppToaster = Toaster.create({
  maxToasts: 1,
});

function PositionButton() {
  const infoMarkerPosition = useAppState(
    (state) => state.core.infoMarkerPosition
  );
  const map = useMapRef();

  const focusState = useFocusState(infoMarkerPosition);

  return h("div.position-controls", [
    h(LocationFocusButton, { location: infoMarkerPosition, focusState }, []),
    isCentered(focusState) ? h(CopyLinkButton) : null,
  ]);
}

function CopyLinkButton() {
  return h(
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
  );
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
    h(PositionButton),
    h("div.spacer"),
    h(LngLatCoords, { position, zoom, className: "infodrawer-header-item" }),
    h.if(elevation != null)(Elevation, {
      elevation,
      className: "infodrawer-header-item",
    }),
    h(Button, { minimal: true, icon: "cross", onClick: onClose }),
  ]);
}
