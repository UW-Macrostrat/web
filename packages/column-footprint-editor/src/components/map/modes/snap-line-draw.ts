import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { isOnOtherVertix } from "../utils";

const SnapLineClosed = { ...SnapLineMode };

SnapLineClosed.onStop = function(state) {
  // This is where I'll do logic to check if it needs to be closed

  let line = state.line;

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

  state.line.removeCoordinate(`${state.currentVertexPosition}`);
  if (state.line.isValid()) {
    const obj = {
      action: "draw.create",
      feature: line.toGeoJSON(),
    };
    this.map.addToChangeSet(obj);
  }

  SnapLineMode.onStop.call(this, state);
};

export { SnapLineClosed };
