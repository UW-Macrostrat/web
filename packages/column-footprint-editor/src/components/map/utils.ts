import * as topojson from "topojson-client";

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
  return featureCollection;
}

/**
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

export { TopoJSONToLineString, coordinatesAreEqual };
