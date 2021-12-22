import { format } from "d3-format";
import { MapBackend } from "../../map-page";
import { setHashString, getHashString } from "@macrostrat/ui-components";

const fmt = format(".4f");

function formatVal(val: any): string | undefined {
  if (isNaN(val)) {
    return undefined;
  }
  return fmt(val);
}

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
    args.layers.push("None");
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

function getInitialMapState() {
  return (dispatch, getState) => {
    // Get the default map state
    let {
      mapXYZ,
      mapHasBedrock,
      mapHasLines,
      mapHasSatellite,
      mapHasColumns,
      mapHasFossils,
    } = getState().update;
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

      const { layers = [], x = 16, y = 23, z = 1.5 } = hashData;

      if (layers.length == 0) {
        if (defaultState.bedrock) {
          layers.push("bedrock");
        }
        if (defaultState.lines) {
          layers.push("lines");
        }
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
        updateURI(getState().update);
        // Augh, got to simplify this multiple dispatch situation. This should be one atomic action.
        dispatch(gotInitialMapState(mapState));
      }
    } catch (e) {
      console.error("Invalid map state:", e);
      // Who knows. Doesn't matter. Nothing does.
      mapState = defaultState;
      updateURI(getState().update);
    }
  };
}

export function gotInitialMapState(mapState) {
  return {
    type: "got-initial-map-state",
    data: mapState,
  };
}

export { getInitialMapState, updateURI };
