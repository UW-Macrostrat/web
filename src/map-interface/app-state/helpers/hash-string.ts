import { format } from "d3-format";
import { setHashString, getHashString } from "@macrostrat/ui-components";
import {
  MapBackend,
  GotInitialMapState,
  MapPosition,
  MapLayer,
  CoreState,
} from "../sections/core/actions";

const fmt = format(".3~f");
const fmt2 = format(".2~f");
const fmtInt = format(".0f");

function updateURI(state: CoreState) {
  let args: object = {};

  for (const filter of state.filters) {
    args[filter.type] = filter.id || filter.name;
  }

  // Update the hash in the URI
  const pos = state.mapPosition.camera ?? {};
  const zoom = state.mapPosition.target?.zoom;
  const { bearing = 0, pitch = 0 } = pos;

  args.x = fmt(pos.lng);
  args.y = fmt(pos.lat);
  if (bearing == 0 && pitch == 0 && zoom != null) {
    args.z = fmt2(zoom);
  } else if (pos.altitude > 5000) {
    args.z = fmt2(pos.altitude / 1000) + "km";
  } else {
    args.z = fmtInt(pos.altitude) + "m";
  }
  if (bearing != 0) {
    let az = pos.bearing;
    if (az < 0) az += 360;
    args.a = fmtInt(az);
  }
  if (pitch != 0) {
    args.e = fmtInt(pos.pitch);
  }

  const layers = getLayerDescriptionFromLayers(state.mapLayers);
  if (layers.length != 0) {
    args.show = layers;
  }

  if (state.timeCursorAge) {
    args.age = state.timeCursorAge;
  }

  if (state.plateModelId) {
    args.model = state.plateModelId;
  }

  setHashString(args, { arrayFormat: "comma", sort: false });
  return state;
}

// The below disabled material is needed to enable filters in the URI
/*
  let {
    mapXYZ,
    mapHasBedrock,
    mapHasLines,
    mapHasSatellite,
    mapHasColumns,
    mapHasFossils,
  } = state;
  let defaultState = {
    z: mapXYZ.z,
    x: mapXYZ.x,
    y: mapXYZ.y,
    satellite: mapHasSatellite,
    bedrock: mapHasBedrock,
    lines: mapHasLines,
    columns: mapHasColumns,
    fossils: mapHasFossils,
  };
  let filterTypes = [
    "strat_name_concepts",
    "strat_name_orphans",
    "intervals",
    "lithology_classes",
    "lithology_types",
    "lithologies",
    "all_lithologies",
    "all_lithology_types",
    "all_lithology_classes",
    "environments",
    "environment_types",
    "environment_classes",
  ];
  let hash = window.location.hash;
  let mapState = {
    incomingFilters: [],
    mapBackend: MapBackend.MAPBOX,
  };
*/

function _fmt(x: string | number | string[]) {
  if (Array.isArray(x)) {
    x = x[0];
  }
  return parseFloat(x.toString());
}

function getLayerDescriptionFromLayers(layers: Set<MapLayer>): string[] {
  let layerArr: string[] = Array.from(layers);
  if (layerArr.length == 0) {
    // Special case for no layers
    layerArr.push("none");
  }

  // If all geology layers are present, remove them and replace with "geology"
  let geoLayers = layerArr.filter((lyr) => geologyLayers.includes(lyr));
  if (geoLayers.length == geologyLayers.length) {
    layerArr = layerArr.filter((lyr) => !geologyLayers.includes(lyr));
    layerArr.push("geology");
  }

  // If "geology" is the only layer, we remove it as implicit
  if (layerArr.length == 1 && layerArr[0] == "geology") {
    layerArr = [];
  }

  return layerArr;
}

function isValidLayer(test: string): test is MapLayer {
  const vals: string[] = Object.values(MapLayer);
  return vals.includes(test);
}

function validateLayers(layers: string[]): Set<MapLayer> {
  return new Set(layers.filter(isValidLayer));
}

const geologyLayers = ["bedrock", "lines"];

function layerDescriptionToLayers(layers: string | string[]): Set<MapLayer> {
  if (!Array.isArray(layers)) {
    layers = [layers];
  }

  if (layers.length == 0) {
    layers = ["geology"];
  }

  if (layers.includes("geology")) {
    layers = layers.filter((lyr) => lyr != "geology");
    layers.push(...geologyLayers);
  }

  if (layers.length == 1 && layers[0] == "none") {
    layers = [];
  }

  return validateLayers(layers);
}

function updateStateFromURI(state): GotInitialMapState | void {
  // Get the default map state
  try {
    const hashData = getHashString(window.location.hash) ?? {};

    let { show = [] } = hashData;
    const { x = 16, y = 23, z = 2, a = 0, e = 0, age, model } = hashData;

    let _age = age != null ? Math.round(parseFloat(age)) : null;
    let _model = model != null ? parseInt(model) : null;

    const mapLayers = layerDescriptionToLayers(show);

    const lng = _fmt(x);
    const lat = _fmt(y);

    let altitude = null;
    let zoom = null;
    const _z = z.toString();
    if (_z.endsWith("km")) {
      altitude = _fmt(_z.substring(0, _z.length - 2)) * 1000;
    } else if (_z.endsWith("m")) {
      altitude = _fmt(_z.substring(0, _z.length - 1));
    } else {
      zoom = _fmt(z);
    }
    const bearing = _fmt(a);
    const pitch = _fmt(e);

    let target = undefined;
    if (bearing == 0 && pitch == 0 && zoom != null) {
      target = {
        lat,
        lng,
        zoom,
      };
    }

    const position: MapPosition = {
      camera: {
        lng: _fmt(x),
        lat: _fmt(y),
        altitude,
        bearing: _fmt(a),
        pitch: _fmt(e),
      },
      target,
    };

    return {
      type: "got-initial-map-state",
      data: {
        mapPosition: position,
        mapLayers,
        mapBackend: MapBackend.MAPBOX3,
      },
      age: _age,
      plateModelId: _model,
    };
  } catch (e) {
    console.error("Invalid map state:", e);
  }
}

export function gotInitialMapState(mapState) {
  return {
    type: "got-initial-map-state",
    data: mapState,
    age: null,
    plateModelId: null,
  };
}

export { updateStateFromURI, updateURI };
