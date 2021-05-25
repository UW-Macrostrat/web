import "regenerator-runtime/runtime";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";

const MultVertDirectSelect = MapboxDraw.modes.direct_select;

MultVertDirectSelect.onSetup = function(opts) {
  const featureId = opts.featureId;
  const feature = this.getFeature(featureId);

  const toMoveFeatures = opts.toMoveFeatures;
  const toMoveCoordPaths = opts.toMoveCoordPaths;
  const movedCoordPath = opts.movedCoordPath;

  if (!feature) {
    throw new Error("You must provide a featureId to enter direct_select mode");
  }

  if (feature.type === Constants.geojsonTypes.POINT) {
    throw new TypeError("direct_select mode doesn't handle point features");
  }

  const state = {
    featureId,
    feature,
    dragMoveLocation: opts.startPos || null,
    dragMoving: false,
    canDragMove: false,
    selectedCoordPaths: opts.coordPath ? [opts.coordPath] : [],
    movedCoordPath,
    toMoveCoordPaths,
    toMoveFeatures,
  };

  this.setSelectedCoordinates(
    this.pathsToCoordinates(featureId, state.selectedCoordPaths)
  );
  this.setSelected(featureId);
  doubleClickZoom.disable(this);

  this.setActionableState({
    trash: true,
  });

  return state;
};

MultVertDirectSelect.onDrag = function(state, e) {
  if (state.canDragMove !== true) return;
  state.dragMoving = true;
  e.originalEvent.stopPropagation();

  //console.log(e);

  const delta = {
    lng: e.lngLat.lng - state.dragMoveLocation.lng,
    lat: e.lngLat.lat - state.dragMoveLocation.lat,
  };
  if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta);

  state.dragMoveLocation = e.lngLat;

  let newCoord = [e.lngLat.lng, e.lngLat.lat];

  // different features, works for more than 2 shared vertices
  if (state.toMoveFeatures) {
    state.toMoveFeatures.map((feature, index) => {
      let coordsToChange = [...feature.coordinates];
      coordsToChange.splice(state.toMoveCoordPaths[index], 1, newCoord);
      feature.setCoordinates(coordsToChange);
    });
  }
};

MultVertDirectSelect.onStop = function(state, addToChangeSet) {
  console.log("Stopped Dragging", state);

  if (state.movedCoordPath) {
    let newCoord = state.feature.coordinates[state.movedCoordPath];
    // different features, works for more than 2 shared vertices
    state.toMoveFeatures.map((feature, index) => {
      let coordsToChange = [...feature.coordinates];
      coordsToChange.splice(state.toMoveCoordPaths[index], 1, newCoord);
      feature.setCoordinates(coordsToChange);
      const action = Constants.updateActions.CHANGE_COORDINATES;
      const geometry = {
        coordinates: feature.coordinates,
        type: feature.type,
      };
      const obj = {
        action,
        feature: {
          geometry,
          properties: feature.properties,
          type: "Feature",
        },
      };
      this.map.addToChangeSet(obj);
    });
  }
  doubleClickZoom.enable(this);
  this.clearSelectedCoordinates();
};

export { MultVertDirectSelect };
