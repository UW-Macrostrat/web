import {
  SnapLineMode,
  MultVertDirectSelect,
  MultVertSimpleSelect,
} from "../modes";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";

function voronoiModeMap(map, polygons, points, lines, addVoronoiPoint) {
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

  if (polygons) {
    console.log("POLYGONS", polygons);
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
    console.log("created new feature!", e);
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
      addVoronoiPoint(feature);
    }
  };

  map.on("draw.create", map.addVoronoiPoint);

  map.on("draw.delete", async function (e) {
    console.log("Deleted a Feature");
    const { type: action, features } = e;
  });

  map.on("draw.update", async function (e) {
    console.log(e);
    const feature = e.features[0];
    const type = feature.geometry.type;
    if (type == "Point") {
    }
  });
  return Draw;
}

export { voronoiModeMap };
