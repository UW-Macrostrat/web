import MapboxDraw from "@mapbox/mapbox-gl-draw";

const SimpleSelect = MapboxDraw.modes.simple_select;

const PointsOnly: any = { ...SimpleSelect };

PointsOnly.clickOnFeature = function (state, e) {
  if (e.featureTarget.geometry.type !== "Point") {
    return;
  }
  SimpleSelect.clickOnFeature.call(this, state, e);
};

// need to just pass off it there aren't other verticies at point
PointsOnly.clickOnVertex = function (state, e) {
  return;
};

export { PointsOnly };
