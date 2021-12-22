import { format } from "d3-format";
import { setHashString, getHashString } from "@macrostrat/ui-components";
import { MapBackend, GotInitialMapState } from "../actions";

const fmt = format(".4f");

export type MapPosition = {
  x: number;
  y: number;
  z: number;
};

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
  let z = fmt(state.mapXYZ.z);
  let x = fmt(state.mapXYZ.x);
  let y = fmt(state.mapXYZ.y);

  setHashString({ ...args, x, y, z }, { arrayFormat: "comma" });
}

function updateStateFromURI(state): GotInitialMapState | void {
  // Get the default map state
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
  try {
    const hashData = getHashString(window.location.hash) ?? {};

    let { layers = ["bedrock", "lines"] } = hashData;
    const { x = 16, y = 23, z = 1.5 } = hashData;

    if (!Array.isArray(layers)) {
      layers = [layers];
    }

    if (layers == ["none"]) {
      layers = [];
    }

    let mapState = { x, y, z, layers };

    if (
      mapState.x &&
      mapState.y &&
      mapState.z &&
      mapState.x >= -180 &&
      mapState.x <= 180 &&
      mapState.y >= -85 &&
      mapState.y <= 85 &&
      mapState.z >= 0 &&
      mapState.z <= 16
    ) {
      // Sweet, it is legit
      mapState = mapState;
      updateURI(state);
      // Augh, got to simplify this multiple dispatch situation. This should be one atomic action.
      return { type: "got-initial-map-state", data: mapState };
    }
  } catch (e) {
    console.error("Invalid map state:", e);
    // // Who knows. Doesn't matter. Nothing does.
    // mapState = defaultState;
    // updateURI(mainState);
  }
}

export function gotInitialMapState(mapState) {
  return {
    type: "got-initial-map-state",
    data: mapState,
  };
}

export { updateStateFromURI, updateURI };
