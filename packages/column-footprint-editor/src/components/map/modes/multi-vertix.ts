import DirectSelect from "@mapbox/mapbox-gl-draw/src/modes/direct_select";
import SimpleSelect from "@mapbox/mapbox-gl-draw/src/modes/simple_select";
import { coordinatesAreEqual } from "../utils";

const MultVertSimpleSelect = { ...SimpleSelect };
const MultVertDirectSelect = { ...DirectSelect };

// need to just pass off it there aren't other verticies at point
MultVertSimpleSelect.clickOnVertex = function(state, e) {
  console.log("mult_vert clicked vertix");
  //console.log(e);
  //console.log(this._ctx);

  // this block gets features other than the clicked one at point
  var point = map.project(e.lngLat);
  const idsAtPoint = this._ctx.api.getFeatureIdsAt(point);
  let features = idsAtPoint.map((id) => this.getFeature(id));

  const currentId = e.featureTarget.properties.parent;
  const currentFeature = this.getFeature(currentId);
  const targetCoords = e.featureTarget.geometry.coordinates;

  features = features.filter((f) => f != null && f.id != currentId); // this will return the other vertix

  if (features.length > 0) {
    console.log("Theres a Shared vertix!!");
    movedCoordPath = e.featureTarget.properties.coord_path;

    const coords = [...targetCoords];

    toMoveFeature = features;

    let match = [];
    features.map((f) => {
      if (f) {
        let coord_path = f.coordinates.map((coord, index) => {
          if (coordinatesAreEqual({ coord1: coord, coord2: coords })) {
            match.push(index);
          }
        });
      }
    });
    toMoveCoordPath = match; // will have same index as toMoveFeature
  } else {
    let truthy = [];
    let coordPaths = [];
    currentFeature.coordinates.map((coord, index) => {
      if (coordinatesAreEqual({ coord1: coord, coord2: targetCoords })) {
        truthy.push(1);
        coordPaths.push(index);
      }
    });
    if (truthy.length > 1) {
      //there will always be at least 1 point the same
      // need to set to moveId to an array of the pathcoords that are the same
      console.log("More than one!!");
      toMoveCoordPath = coordPaths;
      toMoveFeature = currentFeature;
      movedCoordPath = e.featureTarget.properties.coord_path;
      sameFeature = true;
    }
  }

  // this is what the normal simple_select does, we want to keep that the same
  this.changeMode("mult_vert_direct", {
    featureId: e.featureTarget.properties.parent,
    coordPath: e.featureTarget.properties.coord_path,
    startPos: e.lngLat,
  });
};

export { MultVertDirectSelect, MultVertSimpleSelect };
