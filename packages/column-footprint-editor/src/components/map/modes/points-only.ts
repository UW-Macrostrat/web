import "regenerator-runtime/runtime";
import SimpleSelect from "@mapbox/mapbox-gl-draw/src/modes/simple_select";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";
import * as CommonSelectors from "@mapbox/mapbox-gl-draw/src/lib/common_selectors";
import doubleClickZoom from "@mapbox/mapbox-gl-draw/src/lib/double_click_zoom";

import { distance_between_points } from "../utils";

const PointsOnly = { ...SimpleSelect };

PointsOnly.onSetup = function (opts) {
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

PointsOnly.clickOnFeature = function (state, e) {
  if (e.featureTarget.geometry.type !== "Point") {
    return;
  }
  console.log(e.featureTarget.geometry.type);
  // Stop everything
  doubleClickZoom.disable(this);
  this.stopExtendedInteractions(state);

  const isShiftClick = CommonSelectors.isShiftDown(e);
  const selectedFeatureIds = this.getSelectedIds();
  const featureId = e.featureTarget.properties.id;
  const isFeatureSelected = this.isSelected(featureId);

  // Click (without shift) on any selected feature but a point
  if (
    !isShiftClick &&
    isFeatureSelected &&
    this.getFeature(featureId).type !== Constants.geojsonTypes.POINT
  ) {
    // Enter direct select mode
    return this.changeMode(Constants.modes.DIRECT_SELECT, {
      featureId,
    });
  }

  // Shift-click on a selected feature
  if (isFeatureSelected && isShiftClick) {
    // Deselect it
    this.deselect(featureId);
    this.updateUIClasses({ mouse: Constants.cursors.POINTER });
    if (selectedFeatureIds.length === 1) {
      doubleClickZoom.enable(this);
    }
    // Shift-click on an unselected feature
  } else if (!isFeatureSelected && isShiftClick) {
    // Add it to the selection
    this.select(featureId);
    this.updateUIClasses({ mouse: Constants.cursors.MOVE });
    // Click (without shift) on an unselected feature
  } else if (!isFeatureSelected && !isShiftClick) {
    // Make it the only selected feature
    selectedFeatureIds.forEach((id) => this.doRender(id));
    this.setSelected(featureId);
    this.updateUIClasses({ mouse: Constants.cursors.MOVE });
  }

  // No matter what, re-render the clicked feature
  this.doRender(featureId);
};

// need to just pass off it there aren't other verticies at point
PointsOnly.clickOnVertex = function (state, e) {
  return;
};

export { PointsOnly };
