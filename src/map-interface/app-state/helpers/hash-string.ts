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
  let args: object = {
    layers: Array.from(state.mapLayers),
  };

  if (args.layers.length == 0) {
    // Special case for no layers
    args.layers.push("none");
  }

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

function isValidLayer(test: string): test is MapLayer {
  const vals: string[] = Object.values(MapLayer);
  return vals.includes(test);
}

function validateLayers(layers: string[]): Set<MapLayer> {
  return new Set(layers.filter(isValidLayer));
}

function updateStateFromURI(state): GotInitialMapState | void {
  // Get the default map state
  try {
    const hashData = getHashString(window.location.hash) ?? {};

    let { layers = ["bedrock", "lines"] } = hashData;
    const { x = 16, y = 23, z = 2, a = 0, e = 0 } = hashData;

    if (!Array.isArray(layers)) {
      layers = [layers];
    }

    if (layers == ["none"]) {
      layers = [];
    }

    const mapLayers = validateLayers(layers);

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
    };
  } catch (e) {
    console.error("Invalid map state:", e);
  }
}

export function gotInitialMapState(mapState) {
  return {
    type: "got-initial-map-state",
    data: mapState,
  };
}

export { updateStateFromURI, updateURI };
