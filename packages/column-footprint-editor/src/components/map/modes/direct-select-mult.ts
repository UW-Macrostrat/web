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

/**
 * Helper function to add a feature coordinate change to changeset
 * @param feature valid mapbox feature
 */
MultVertDirectSelect.onDragChangeSetAdder = function(feature) {
  const action = Constants.updateActions.CHANGE_COORDINATES;
  const geometry = {
    coordinates: feature.coordinates,
    type: feature.type,
  };
  const obj = {
    action,
    feature: {
      id: feature.id,
      geometry,
      properties: feature.properties,
      type: "Feature",
    },
  };
  this.map.addToChangeSet(obj);
};

MultVertDirectSelect.onStop = function(state) {
  if (state.movedCoordPath) {
    let newCoord = state.feature.coordinates[state.movedCoordPath];
    // different features, works for more than 2 shared vertices
    state.toMoveFeatures.map((feature, index) => {
      let coordsToChange = [...feature.coordinates];
      coordsToChange.splice(state.toMoveCoordPaths[index], 1, newCoord);
      feature.setCoordinates(coordsToChange);
      this.onDragChangeSetAdder(feature);
    });
  } else {
    this.onDragChangeSetAdder(state.feature);
  }
  doubleClickZoom.enable(this);
  this.clearSelectedCoordinates();
};

MultVertDirectSelect.onTrash = function(state) {
  // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
  // in reverse order so that we can remove by index safely.
  console.log("Trashing", state.feature);
  console.log("TRASHING", state.selectedCoordPaths);
  console.log("TRASHING", state);
  if (!state.toMoveCoordPaths) {
    //no shared vertices
    state.selectedCoordPaths
      .sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
      .forEach((id) => {
        state.feature.removeCoordinate(id);
      });
    this.fireUpdate();
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    this.fireActionable(state);
    if (state.feature.isValid() === false) {
      this.deleteFeature([state.featureId]);
      this.changeMode(Constants.modes.SIMPLE_SELECT, {});
    }
  } else {
    /// we only want to delete the one point..
    const pointId = parseInt(state.selectedCoordPaths[0]);
    state.feature.removeCoordinate(pointId);
  }
};

export { MultVertDirectSelect };
