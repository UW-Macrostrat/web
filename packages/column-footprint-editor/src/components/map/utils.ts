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

export { TopoJSONToLineString };
