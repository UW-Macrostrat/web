import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as Constants from "@mapbox/mapbox-gl-draw/src/constants";

let DrawPolygon = MapboxDraw.modes.draw_polygon;

DrawPolygon.clickAnywhere = function(state, e) {
  const { x, y } = e.point;

  let { lng: x1, lat: y1 } = this.map.unproject([x, y]);
  let { lng: x2, lat: y2 } = this.map.unproject([x, y - 100]);
  let { lng: x3, lat: y3 } = this.map.unproject([x - 100, y - 100]);
  let { lng: x4, lat: y4 } = this.map.unproject([x - 100, y]);
  const bbox = [
    [x1, y1],
    [x2, y2],
    [x3, y3],
    [x4, y4],
    [x1, y1],
  ];

  var line = this.newFeature({
    type: Constants.geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: Constants.geojsonTypes.LINE_STRING,
      coordinates: bbox,
    },
  });

  const obj = {
    action: "draw.create",
    feature: line.toGeoJSON(),
  };
  this.map.addToChangeSet(obj);

  this.addFeature(line);

  this.changeMode("simple_select");
};

export { DrawPolygon };
