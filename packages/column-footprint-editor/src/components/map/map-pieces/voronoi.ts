import {
  SnapLineMode,
  MultVertDirectSelect,
  MultVertSimpleSelect,
} from "../modes";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { addIdsToGeoJSON } from "./utils";

function voronoiModeMap(
  map,
  polygons,
  points,
  lines,
  addVoronoiPoint,
  moveVoronoiPoint,
  deleteVoronoiPoint
) {
  const Draw = new MapboxDraw({
    controls: { polygon: false },
    modes: Object.assign(
      {
        direct_select: MultVertDirectSelect,
        simple_select: MultVertSimpleSelect,
      },
      MapboxDraw.modes,
      { draw_line_string: SnapLineMode }
    ),
    styles: SnapModeDrawStyles,
    snap: true,
    clickBuffer: 10,
    snapOptions: {
      snapPx: 25,
    },
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
  map.on("click", async function (e) {
    console.log("Mode", Draw.getMode());
  });

  map.addVoronoiPoint = async function (e) {
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      addVoronoiPoint(feature);
    }
  };
  map.moveVoronoiPoint = async function (e) {
    console.log("Moving feature");
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      moveVoronoiPoint(feature);
    }
  };

  map.deleteVoronoiPoint = async function (e) {
    console.log("Deleting feature");
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
