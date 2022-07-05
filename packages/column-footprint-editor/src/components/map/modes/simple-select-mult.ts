import "regenerator-runtime/runtime";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";

import { distance_between_points } from "../utils";

const MultVertSimpleSelect = MapboxDraw.modes.simple_select;

MultVertSimpleSelect.onSetup = function (opts) {
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

MultVertSimpleSelect.fireUpdate = function () {
  this.getSelected().map((f) => {
    const action = Constants.updateActions.CHANGE_COORDINATES;
    const obj = {
      action,
      feature: f.toGeoJSON(),
    };
    this.map.addToChangeSet(obj);
  });
  this.map.fire(Constants.events.UPDATE, {
    action: Constants.updateActions.MOVE,
    features: this.getSelected().map((f) => f.toGeoJSON()),
  });
};

// need to just pass off it there aren't other verticies at point
MultVertSimpleSelect.clickOnVertex = function (state, e) {
  if (e.originalEvent.shiftKey) {
    this.changeMode("direct_select", {
      featureId: e.featureTarget.properties.parent,
      coordPath: e.featureTarget.properties.coord_path,
      startPos: e.lngLat,
      toMoveFeatures: state.toMoveFeatures,
      toMoveCoordPaths: state.toMoveCoordPaths,
      movedCoordPath: state.movedCoordPath,
    });
    return;
  }

  // this block gets features other than the clicked one at point
  var point = this.map.project(e.lngLat);
  const idsAtPoint = this._ctx.api.getFeatureIdsAt(point);
  let features = idsAtPoint.map((id) => this.getFeature(id));
  features = features.filter((f) => f != null); // this will return the other vertix
  if (features.length > 0) {
    state.movedCoordPath = e.featureTarget.properties.coord_path; // "0.5" might mean first feature 4th point
    let match = [];
    let movingFeatures = [];
    features.map((fs) => {
      // multiline string
      fs.features.map((f, lineIndex) => {
        // f is a linestring, line_index is which line in the multilinestring!
        if (f) {
          f.coordinates.map((coord, pointIndex) => {
            let point1 = this.map.project(coord);
            if (
              distance_between_points({ point1: point, point2: point1 }) < 10
            ) {
              match.push(`${lineIndex}.${pointIndex}`);
              movingFeatures.push(fs);
            }
          });
        }
      });
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
