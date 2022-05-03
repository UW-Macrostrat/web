import { hyperStyled } from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import React, { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../comp.module.scss";
import { FormGroup, NumericInput } from "@blueprintjs/core";
const h = hyperStyled(styles);

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

async function initializeMap(
  mapContainerRef: React.Ref<HTMLElement | string>,
  viewport: ViewPointI,
  setViewport: (v: ViewPointI) => void
) {
  var map = new mapboxgl.Map({
    container: mapContainerRef,
    style: "mapbox://styles/mapbox/streets-v11", // style URL
    center: [viewport.longitude, viewport.latitude], // starting position [lng, lat]
    zoom: viewport.zoom, // starting zoom
  });

  var nav = new mapboxgl.NavigationControl();

  map.addControl(nav);

  map.on("move", () => {
    const [zoom, latitude, longitude] = [
      map.getZoom(),
      map.getCenter().lat,
      map.getCenter().lng,
    ];
    setViewport({ longitude, latitude, zoom });
  });

  return map;
}

async function editModeMap(
  map: mapboxgl.Map,
  point: Point,
  changePoint: (e: FeaturesI) => void
) {
  console.log(map);
  const Draw = new MapboxDraw({
    controls: { point: true, trash: true },
    displayControlsDefault: false,
  });
  map.addControl(Draw, "top-left");

  Draw.add(point);

  map.on("draw.create", changePoint);

  map.on("draw.update", changePoint);

  return Draw;
}

interface FeaturesI {
  features: Point[];
}

interface LngLatMapI {
  point: Point;
  setPoint: (p: Point) => void;
}
interface ViewPointI {
  longitude: number;
  latitude: number;
  zoom: number;
}

type PointCoords = [number, number];
type PointGeom = { coordinates: PointCoords; type: string };

export interface Point {
  geometry: PointGeom;
  id: string | number;
  properties: object;
  type: string;
}

function LngLatMap_(props: LngLatMapI) {
  const { point, setPoint } = props;
  const [viewport, setViewport] = useState<ViewPointI>({
    longitude: -80,
    latitude: 30,
    zoom: 2,
  });

  const [map, setMap] = useState<mapboxgl.Map>();

  const mapContainerRef = useRef(null);
  const drawRef = useRef();

  const changePoint = (e: FeaturesI) => {
    console.log("Change Point Triggered!");
    setPoint(e.features[0]);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mapContainerRef.current == null) return;
    initializeMap(mapContainerRef.current, viewport, setViewport).then(
      (mapObj) => {
        setMap(mapObj);
      }
    );
    return () => {
      if (typeof map !== "undefined") {
        map.remove();
      }
    };
  }, [mapContainerRef]);

  useEffect(() => {
    if (typeof map === "undefined") return;
    if (typeof window === "undefined") return;

    editModeMap(map, point, changePoint).then((draw) => {
      drawRef.current = draw;
    });
    return () => {
      let Draw = drawRef.current;
      if (!map || !Draw) return;
      try {
        map.off("draw.create", changePoint);
        map.off("draw.update", changePoint);
        map.removeControl(Draw);
      } catch (error) {
        console.log(error);
      }
    };
  }, [point, map]);

  return h("div", [h("div.map-container", { ref: mapContainerRef })]);
}

function LngLatInputs(props: LngLatMapI) {
  const { point, setPoint } = props;

  const [longitude, latitude] = point.geometry.coordinates;

  const onChangeLong = (e: number) => {
    const newPoint: Point = {
      geometry: { coordinates: [e, latitude], type: "Point" },
      id: "",
      properties: {},
      type: "Feature",
    };
    setPoint(newPoint);
  };
  const onChangeLat = (e: number) => {
    const newPoint: Point = {
      geometry: { coordinates: [longitude, e], type: "Point" },
      id: "",
      properties: {},
      type: "Feature",
    };
    setPoint(newPoint);
  };

  return h("div.latlnginputs", [
    h(FormGroup, { label: "Longitude", helperText: "-180 to 180" }, [
      h(NumericInput, { value: longitude, onValueChange: onChangeLong }),
    ]),
    h(FormGroup, { label: "Latitude", helperText: "-90 to 90" }, [
      h(NumericInput, { value: latitude, onValueChange: onChangeLat }),
    ]),
  ]);
}

function roundCoordinates(p: Point) {
  let [long, lat] = p.geometry.coordinates;
  p.geometry.coordinates = [
    parseFloat(long.toPrecision(7)),
    parseFloat(lat.toPrecision(7)),
  ];
}

/* break state out and share it */
function LngLatMap(props: {
  longitude: number;
  latitude: number;
  onChange: (p: Point) => void;
}) {
  const [point, setPoint] = useState<Point>({
    geometry: { coordinates: [props.longitude, props.latitude], type: "Point" },
    id: "",
    properties: {},
    type: "Feature",
  });

  const setPoint_ = (p: Point) => {
    roundCoordinates(p);
    setPoint(p);
  };

  useEffect(() => {
    props.onChange(point);
  }, [point]);

  return h("div", [
    h(LngLatMap_, { point, setPoint: setPoint_ }),
    h(LngLatInputs, { point, setPoint: setPoint_ }),
  ]);
}

export { initializeMap, editModeMap, LngLatMap };
