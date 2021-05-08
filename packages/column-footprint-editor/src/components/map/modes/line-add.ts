import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";
import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";
import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { isOnOtherVertix } from "../utils";

const SnapLineClosed = { ...SnapLineMode };

SnapLineClosed.onStop = function(state) {
  // This is where I'll do logic to check if it needs to be closed

  console.log(state);
  console.log(this);

  const firstVertix = state.line.coordinates[0]; // first coordinate of line made
  const lastVertix = state.line.coordinates.slice(-1)[0]; // last coordinate of line made

  const firstPoint = this.map.project({
    lng: firstVertix[0],
    lat: firstVertix[1],
  });
  const lastPoint = this.map.project({
    lng: lastVertix[0],
    lat: lastVertix[1],
  });

  const isOnSharedVertix = isOnOtherVertix(firstVertix, state.vertices);
  console.log(isOnSharedVertix);

  SnapLineMode.onStop.call(this, state);
};

export { SnapLineClosed };
