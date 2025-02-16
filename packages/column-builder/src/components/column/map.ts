import { hyperStyled } from "@macrostrat/hyper";
import mapboxgl from "mapbox-gl";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useEffect, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../comp.module.sass";
import {
  LngLatMap as LngLatMap_,
  LngLatInputs,
  Point,
} from "@macrostrat/form-components";
const h = hyperStyled(styles);

mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlZmFsbGluZ2R1Y2siLCJhIjoiY2tsOHAzeDZ6MWtsaTJ2cXhpMDAxc3k5biJ9.FUMK57K0UP7PSrTUi3DiFQ";

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
  disabled: boolean;
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
    h("h4", { style: { marginTop: 0 } }, ["Set a location"]),
    h(LngLatMap_, { point, setPoint: setPoint_, disabled: props.disabled }),
    h("div.lng-lat-inputs", [
      h(LngLatInputs, {
        point,
        setPoint: setPoint_,
        disabled: props.disabled,
      }),
    ]),
  ]);
}

export { LngLatMap };
