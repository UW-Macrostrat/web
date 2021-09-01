import * as topojson from "topojson-client";
import mapboxgl from "mapbox-gl";

function TopoJSONToLineString(json) {
  const multiLineString = topojson.mesh(json);

  const lines = multiLineString.coordinates;

  const features = lines.map((line) => {
    const lineString = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: line,
      },
    };

    return lineString;
  });

  const featureCollection = {
    type: "FeatureCollection",
    features: features,
  };
  console.log(featureCollection);
  return featureCollection;
}

/**
 * Would be better if I could do it based on pixel distance
 * Function tells whether too coordinates are the same or not
 * @param props
 * coord1:  [lng, lat]
 * coord2: [lng,lat]
 *
 *
 * @returns boolean
 */
function coordinatesAreEqual(props) {
  const { coord1, coord2 } = props;
  if (
    coord1[0].toFixed(1) == coord2[0].toFixed(1) &&
    coord1[1].toFixed(1) == coord2[1].toFixed(1)
  ) {
    return true;
  } else {
    return false;
  }
}

/**
 * Function to find distance between two points, using pixel distance
 * and basic geometry
 * @param props
 * @returns
 */
function distance_between_points(props) {
  const { point1, point2 } = props;
  let x1 = point1.x;
  let x2 = point2.x;

  let y1 = point1.y;
  let y2 = point2.y;

  let a = Math.pow(x2 - x1, 2);
  let b = Math.pow(y2 - y1, 2);

  return Math.sqrt(a + b);
}

function isOnOtherVertix(currentVertix, vertices) {
  let match = [];
  vertices.map((vertex) => {
    if (Array.isArray(vertex)) {
      if (coordinatesAreEqual({ coord1: currentVertix, coord2: vertex })) {
        match.push(1);
      }
    }
  });
  return match.length > 0;
}

function locationFromHash(hash) {
  if (hash == null) {
    ({ hash } = window.location);
  }
  const s = hash.slice(1);
  const v = s.split("/");
  if (v.length !== 3) {
    return { zoom: 2, latitude: 43, longitude: -89 };
  }
  const [zoom, latitude, longitude] = v.map((d) => parseFloat(d));

  return { zoom, latitude, longitude };
}

function setWindowHash({ zoom, latitude, longitude }) {
  const hashString = `${zoom}/${latitude}/${longitude}`;
  window.location.hash = hashString;
}

export {
  TopoJSONToLineString,
  coordinatesAreEqual,
  isOnOtherVertix,
  distance_between_points,
  locationFromHash,
  setWindowHash,
};
