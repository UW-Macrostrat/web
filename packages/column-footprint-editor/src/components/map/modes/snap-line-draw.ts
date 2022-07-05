//import { SnapLineMode, SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";

import {
  geojsonTypes,
  activeStates,
  meta,
  cursors,
} from "@mapbox/mapbox-gl-draw/src/constants";
import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";
import DrawLine from "@mapbox/mapbox-gl-draw/src/modes/draw_line_string";
import {
  addPointTovertices,
  createSnapList,
} from "mapbox-gl-draw-snap-mode/src/utils";
import createVertex from "@mapbox/mapbox-gl-draw/src/lib/create_vertex";
import {
  createPointOnLine,
  incrementMultiPath,
  parseMultiPath,
  snapToCoord,
} from "./utils";

const SnapLineMode = { ...DrawLine };

SnapLineMode.onSetup = function (opts) {
  const line = this.newFeature({
    type: geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: geojsonTypes.MULTI_LINE_STRING,
      coordinates: [[]],
    },
  });

  this.addFeature(line);

  const selectedFeatures = this.getSelected();
  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  const [snapList, vertices] = createSnapList(this.map, this._ctx.api, line);

  const state = {
    map: this.map,
    line,
    currentVertexPosition: "0.0",
    vertices,
    snapList,
    selectedFeatures,
    direction: "forward", // expected by DrawLineString
  };

  state.options = this._ctx.options;

  const moveendCallback = () => {
    const [snapList, vertices] = createSnapList(this.map, this._ctx.api, line);
    state.vertices = vertices;
    state.snapList = snapList;
  };
  // for removing listener later on close
  state["moveendCallback"] = moveendCallback;

  const optionsChangedCallBAck = (options) => {
    state.options = options;
  };
  // for removing listener later on close
  state["optionsChangedCallBAck"] = optionsChangedCallBAck;

  this.map.on("moveend", moveendCallback);
  this.map.on("draw.snap.options_changed", optionsChangedCallBAck);

  return state;
};

SnapLineMode.clickAnywhere = function (state, e) {
  const lng = state.snappedLng;
  const lat = state.snappedLat;

  addPointTovertices(state.map, state.vertices, [lng, lat]);

  var point = this.map.project({ lng, lat });
  const idsAtPoint = this._ctx.api.getFeatureIdsAt(point);
  const filteredIds = idsAtPoint.filter((id) => id != state.line.id);
  createPointOnLine(filteredIds, [lng, lat], this);

  state.line.updateCoordinate(state.currentVertexPosition, lng, lat);

  state.currentVertexPosition = incrementMultiPath(state.currentVertexPosition);

  state.line.updateCoordinate(state.currentVertexPosition, lng, lat);
};

SnapLineMode.onMouseMove = function (state, e) {
  const [lng, lat] = snapToCoord(state, e, this.map);

  state.line.updateCoordinate(state.currentVertexPosition, lng, lat);
  state.snappedLng = lng;
  state.snappedLat = lat;

  if (
    state.lastVertex &&
    state.lastVertex[0] === lng &&
    state.lastVertex[1] === lat
  ) {
    this.updateUIClasses({ mouse: cursors.POINTER });
  } else {
    this.updateUIClasses({ mouse: cursors.ADD });
  }
};

// This is 'extending' DrawLine.toDisplayFeatures
SnapLineMode.toDisplayFeatures = function (state, geojson, display) {
  const isActiveLine = geojson.properties.id === state.line.id;
  geojson.properties.active = isActiveLine
    ? activeStates.ACTIVE
    : activeStates.INACTIVE;
  if (!isActiveLine) return display(geojson);

  const [line, path] = parseMultiPath(state.currentVertexPosition);

  // Only render the line if it has at least one real coordinate
  if (geojson.geometry.coordinates[line].length < 2) return;
  geojson.properties.meta = meta.FEATURE;

  display(
    createVertex(
      //parentId, coordinates, path, selected
      state.line.id,
      geojson.geometry.coordinates[line][
        state.direction === "forward"
          ? geojson.geometry.coordinates[line].length - 2
          : 1
      ],
      `${line}.${
        state.direction === "forward"
          ? geojson.geometry.coordinates[line].length - 2
          : 1
      }`,
      false
    )
  );

  display(geojson);
};

// This is 'extending' DrawLine.onStop
SnapLineMode.onStop = function (state) {
  // remove moveemd callback
  this.map.off("moveend", state.moveendCallback);

  DrawLine.onStop.call(this, state);
  const obj = {
    action: "draw.create",
    feature: state.line.toGeoJSON(),
  };
  this.map.addToChangeSet(obj);
};

export { SnapLineMode };
