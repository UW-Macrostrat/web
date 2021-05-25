import "regenerator-runtime/runtime";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import { distance_between_points } from "../utils";

const MultVertSimpleSelect = MapboxDraw.modes.simple_select;

MultVertSimpleSelect.onSetup = function(opts) {
  // turn the opts into state.
  const state = {
    dragMoveLocation: null,
    boxSelectStartLocation: null,
    boxSelectElement: undefined,
    boxSelecting: false,
    canBoxSelect: false,
    dragMoving: false,
    canDragMove: false,
    initiallySelectedFeatureIds: opts.featureIds || [],
    movedCoordPath: undefined,
    toMoveCoordPaths: undefined,
    toMoveFeatures: undefined,
  };

  this.setSelected(
    state.initiallySelectedFeatureIds.filter(
      (id) => this.getFeature(id) !== undefined
    )
  );
  this.fireActionable();

  this.setActionableState({
    combineFeatures: true,
    uncombineFeatures: true,
    trash: true,
  });

  return state;
};

// need to just pass off it there aren't other verticies at point
MultVertSimpleSelect.clickOnVertex = function(state, e) {
  console.log("mult_vert clicked vertix");

  // this block gets features other than the clicked one at point
  var point = this.map.project(e.lngLat);
  const idsAtPoint = this._ctx.api.getFeatureIdsAt(point);
  let features = idsAtPoint.map((id) => this.getFeature(id));

  features = features.filter((f) => f != null); // this will return the other vertix

  console.log("Number of Features", features.length);
  if (features.length > 0) {
    console.log("You've clicked multiple vertices");
    state.movedCoordPath = e.featureTarget.properties.coord_path;

    let match = [];
    let movingFeatures = [];
    features.map((f) => {
      if (f) {
        let coord_path = f.coordinates.map((coord, index) => {
          let point1 = this.map.project(coord);
          if (distance_between_points({ point1: point, point2: point1 }) < 10) {
            match.push(index);
            movingFeatures.push(f);
          }
        });
      }
    });
    state.toMoveCoordPaths = match;
    state.toMoveFeatures = movingFeatures;
  }

  // this is what the normal simple_select does, we want to keep that the same
  this.changeMode("direct_select", {
    featureId: e.featureTarget.properties.parent,
    coordPath: e.featureTarget.properties.coord_path,
    startPos: e.lngLat,
    toMoveFeatures: state.toMoveFeatures,
    toMoveCoordPaths: state.toMoveCoordPaths,
    movedCoordPath: state.movedCoordPath,
  });
};

export { MultVertSimpleSelect };
