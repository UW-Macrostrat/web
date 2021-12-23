import { format } from "d3-format";
import { setHashString, getHashString } from "@macrostrat/ui-components";
import {
  MapBackend,
  GotInitialMapState,
  MapPosition,
  MapLayer,
} from "../actions";

const fmt = format(".4f");
const fmtInt = format(".0f");

function updateURI(state: any) {
  let layers = [
    { layer: "bedrock", haz: state.mapHasBedrock },
    { layer: "lines", haz: state.mapHasLines },
    { layer: "satellite", haz: state.mapHasSatellite },
    { layer: "fossils", haz: state.mapHasFossils },
    { layer: "columns", haz: state.mapHasColumns },
  ];

  let args: any = {};

  args.layers = layers
    .filter((l) => {
      if (l.haz) return l;
    })
    .map((l) => {
      return l.layer;
    });

  if (args.layers.length == 0) {
    // Special case for no layers
    args.layers.push("none");
  }

  for (const filter of state.filters) {
    args[filter.type] = filter.id || filter.name;
  }

  // Update the hash in the URI
  const pos = state.mapPosition.camera ?? {};
  const { bearing = 0, pitch = 0 } = pos;

  args.z = fmtInt(pos.altitude ?? 300000);
  args.x = fmt(pos.lng);
  args.y = fmt(pos.lat);
  if (bearing != 0) {
    args.a = fmtInt(pos.bearing);
  }
  if (pitch != 0) {
    args.e = fmtInt(pos.pitch);
  }

  setHashString(args, { arrayFormat: "comma" });
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

function updateStateFromURI(state): GotInitialMapState | void {
  // Get the default map state
  try {
    const hashData = getHashString(window.location.hash) ?? {};

    let { layers = ["bedrock", "lines"] } = hashData;
    console.log(hashData);
    const { x = 16, y = 23, z = 80000, a = 0, e = 0 } = hashData;

    if (!Array.isArray(layers)) {
      layers = [layers];
    }

    if (layers == ["none"]) {
      layers = [];
    }

    const position: MapPosition = {
      camera: {
        lng: _fmt(x),
        lat: _fmt(y),
        altitude: _fmt(z),
        bearing: _fmt(a),
        pitch: _fmt(e),
      },
    };

    console.log(position);

    const mapState = {
      position,
      layers: layers as MapLayer[],
      backend: MapBackend.MAPBOX3,
    };

    return { type: "got-initial-map-state", data: mapState };
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
