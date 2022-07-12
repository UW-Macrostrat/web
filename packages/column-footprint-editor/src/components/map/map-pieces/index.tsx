export * from "./properties";
export * from "./map-legend";
export * from "./add-geom";
export * from "./voronoi";
import mapboxgl from "mapbox-gl";
import { setWindowHash } from "../utils";
import {
  SnapLineMode,
  MultVertDirectSelect,
  MultVertSimpleSelect,
  DrawPolyMult,
} from "../modes";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";
import { LotsOfPointsMode } from "../modes/lots-of-points";

async function initializeMap(
  mapContainerRef,
  viewport,
  addToChangeSet,
  setViewport
) {
  var map = new mapboxgl.Map({
    container: mapContainerRef,
    style: "mapbox://styles/mapbox/streets-v11", // style URL
    center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
    zoom: viewport.zoom, // starting zoom
  });

  var nav = new mapboxgl.NavigationControl();

  map.addControl(nav);

  map.addToChangeSet = addToChangeSet;

  map.on("move", () => {
    const [zoom, latitude, longitude] = [
      map.getZoom().toFixed(2),
      map.getCenter().lat.toFixed(4),
      map.getCenter().lng.toFixed(4),
    ];
    setViewport({ longitude, latitude, zoom });
    setWindowHash({ zoom, latitude, longitude });
  });
  return map;
}

function editModeMap(map, state) {
  /// draw.create, draw.delete, draw.update, draw.selectionchange
  /// draw.modechange, draw.actionable, draw.combine, draw.uncombine
  const Draw = new MapboxDraw({
    controls: { point: false },
    modes: Object.assign(
      {
        direct_select: MultVertDirectSelect,
        simple_select: MultVertSimpleSelect,
        draw_polygon: DrawPolyMult,
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

  Draw.add(state.lines);

  map.on("click", async function (e) {
    console.log("Mode", Draw.getMode());
  });

  map.on("draw.create", async function (e) {
    console.log("created new feature!");
  });

  map.on("draw.delete", async function (e) {
    console.log("Deleted a Feature");
    const { type: action, features } = e;

    features.map((feature) => {
      console.log("Deleteing", feature);
      const obj = { action, feature };
      map.addToChangeSet(obj);
    });
  });

  map.on("draw.update", async function (e) {
    console.log(e);
    Draw.changeMode("simple_select");
  });
  return Draw;
}

export { initializeMap, editModeMap };
