import "regenerator-runtime/runtime";
import SimpleSelect from "@mapbox/mapbox-gl-draw/src/modes/simple_select";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const PointsOnly = { ...SimpleSelect };

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
