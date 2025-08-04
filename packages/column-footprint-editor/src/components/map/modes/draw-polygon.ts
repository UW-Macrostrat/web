import MapboxDraw from "@mapbox/mapbox-gl-draw";

import { distance_between_points } from "../utils";

const { CommonSelectors, doubleClickZoom } = MapboxDraw.lib;

const DrawPolygon = MapboxDraw.modes.draw_polygon;
const { geojsonTypes, meta, activeStates } = MapboxDraw.constants;

let DrawPolyMult: any = { ...DrawPolygon };

DrawPolyMult.onSetup = function (opts) {
  const line = this.newFeature({
    type: geojsonTypes.FEATURE,
    properties: {},
    geometry: {
      type: geojsonTypes.MULTI_LINE_STRING,
      coordinates: [[]],
    },
  });

  this.addFeature(line);

  this.clearSelectedFeatures();
  doubleClickZoom.disable(this);

  return { line, canDraw: false, n: 6 };
};

DrawPolyMult.createNPolygon = function (x, y, n, r) {
  // n is number of sides
  // x is the xoffset
  // y is the yoffset
  // r is radius

  const polygon: number[][] = [];

  for (let i = 0; i <= n; i++) {
    const pointX = r * Math.cos(i * ((2 * Math.PI) / n)) + x;
    const pointY = r * Math.sin(i * ((2 * Math.PI) / n)) + y;
    const { lng, lat }: { lng: number; lat: number } = this.map.unproject([
      pointX,
      pointY,
    ]);
    polygon.push([lng, lat]);
  }
  return [polygon];
};

DrawPolyMult.onMouseMove = function (state, e) {
  if (!state.canDraw) return;

  const { n } = state;
  const { x, y } = state.centerPoint;

  const buffer =
    distance_between_points({ point1: e.point, point2: state.centerPoint }) +
    10;

  const bbox = this.createNPolygon(x, y, n, buffer);

  state.line.setCoordinates(bbox);
};

DrawPolyMult.clickAnywhere = function (state, e) {
  state.canDraw = true;
  state.centerPoint = e.point;
};

DrawPolyMult.onKeyUp = function (state, e) {
  if (CommonSelectors.isEscapeKey(e)) {
    this.deleteFeature([state.line.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  } else if (CommonSelectors.isEnterKey(e)) {
    this.changeMode(Constants.modes.SIMPLE_SELECT);
  } else {
    if (e.key == "a") {
      state.n += 1;
    } else if (e.key == "s" && state.n > 3) {
      state.n -= 1;
    }
  }
};

DrawPolyMult.onStop = function (state) {
  this.updateUIClasses({ mouse: Constants.cursors.NONE });
  doubleClickZoom.enable(this);
  this.activateUIButton();

  // check to see if we've deleted this feature
  if (this.getFeature(state.line.id) === undefined) return;

  //remove last added coordinate
  if (state.line.isValid()) {
    this.map.fire(Constants.events.CREATE, {
      features: [state.line.toGeoJSON()],
    });
    const obj = {
      action: "draw.create",
      feature: state.line.toGeoJSON(),
    };
    this.map.addToChangeSet(obj);
  } else {
    this.deleteFeature([state.line.id], { silent: true });
    this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true });
  }
};

DrawPolyMult.toDisplayFeatures = function (state, geojson, display) {
  const isActiveLine = geojson.properties.id === state.line.id;
  geojson.properties.active = isActiveLine
    ? activeStates.ACTIVE
    : activeStates.INACTIVE;
  geojson.properties.meta = meta.FEATURE;
  display(geojson);
};

export { DrawPolyMult };
