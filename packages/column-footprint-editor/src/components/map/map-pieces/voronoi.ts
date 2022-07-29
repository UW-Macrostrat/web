import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { PointsOnly } from "../modes";

function voronoiModeMap(
  map,
  polygons,
  points,
  lines,
  addVoronoiPoint,
  moveVoronoiPoint,
  deleteVoronoiPoint
) {
  const modes = Object.assign(MapboxDraw.modes, {
    simple_select: PointsOnly,
  });

  const Draw = new MapboxDraw({
    controls: {
      polygon: false,
      line_string: false,
      trash: false,
      combine_features: false,
      uncombine_features: false,
    },
    modes,
  });

  map.addControl(Draw, "top-left");

  if (polygons?.length ?? false) {
    Draw.add({ type: "FeatureCollection", features: polygons });
  }
  if (lines) {
    Draw.add(lines);
  }
  if (points) {
    Draw.add({ type: "FeatureCollection", features: points });
  }

  map.addVoronoiPoint = async function (e) {
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      addVoronoiPoint(feature);
    }
  };
  map.moveVoronoiPoint = async function (e) {
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      moveVoronoiPoint(feature);
    }
  };

  map.deleteVoronoiPoint = async function (e) {
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      deleteVoronoiPoint(feature);
    }
  };

  map.on("draw.create", map.addVoronoiPoint);
  map.on("draw.delete", map.deleteVoronoiPoint);
  map.on("draw.update", map.moveVoronoiPoint);
  return Draw;
}

export { voronoiModeMap };
