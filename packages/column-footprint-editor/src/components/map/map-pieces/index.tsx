import React from "react";
import mapboxgl from "mapbox-gl";
import { setWindowHash, locationFromHash } from "../utils";
import {
  SnapLineClosed,
  MultVertDirectSelect,
  MultVertSimpleSelect,
  DrawPolygon,
} from "../modes";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { SnapModeDrawStyles } from "mapbox-gl-draw-snap-mode";

async function initializeMap(
  mapContainerRef,
  viewport,
  setChangeSet,
  setViewport
) {
  var map = new mapboxgl.Map({
    container: mapContainerRef,
    style: "mapbox://styles/mapbox/streets-v11", // style URL
    center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
    zoom: viewport.zoom, // starting zoom
  });

  const addToChangeSet = (obj) => {
    setChangeSet((prevState) => {
      return [...prevState, ...new Array(obj)];
    });
  };

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
  var Draw = new MapboxDraw({
    controls: { point: false },
    modes: Object.assign(
      {
        direct_select: MultVertDirectSelect,
        simple_select: MultVertSimpleSelect,
        draw_polygon: DrawPolygon,
      },
      MapboxDraw.modes,
      { draw_line_string: SnapLineClosed }
    ),
    styles: SnapModeDrawStyles,
    snap: true,
    snapOptions: {
      snapPx: 25,
    },
  });

  map.addControl(Draw, "top-left");

  var featureIds = Draw.add(state.lines);

  map.on("click", async function(e) {
    console.log(Draw.getMode());
  });

  map.on("draw.create", async function(e) {
    console.log(e);
    console.log("created new feature!");
    const { type: action, features } = e;

    features.map((feature) => {
      const obj = { action, feature };
      map.addToChangeSet(obj);
    });
  });

  map.on("draw.delete", async function(e) {
    console.log(e);
    const { type: action, features } = e;

    features.map((feature) => {
      const obj = { action, feature };
      map.addToChangeSet(obj);
    });
  });

  // use the splice to replace coords
  // This needs to account for deleteing nodes. That falls under change_coordinates
  map.on("draw.update", async function(e) {
    Draw.changeMode("simple_select", [e.features[0].id]);
  });
  return Draw;
}

async function propertyViewMap(map, state, setFeatures, setOpen) {
  map.addSource("columns", {
    type: "geojson",
    data: state.columns,
  });
  map.addLayer({
    id: "column-fill",
    type: "fill",
    source: "columns", // reference the data source
    paint: {
      "fill-color": [
        "case",
        ["==", ["get", "col_id"], "nan"],
        "#F95E5E",
        "#0BDCB9",
      ], // blue color fill
      "fill-opacity": 0.5,
    },
  });
  map.addLayer({
    id: "outline",
    type: "line",
    source: "columns",
    layout: {},
    paint: {
      "line-color": "#000",
      "line-width": 1,
    },
  });

  map.on("click", "column-fill", async function(e) {
    setFeatures(e.features);
    setOpen(true);
  });
}

export { propertyViewMap, initializeMap, editModeMap };
