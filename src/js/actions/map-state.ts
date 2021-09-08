import { addFilter, gotInitialMapState } from "./main";
import { format } from "d3-format";
import { MapBackend } from "../map-page";
import {
  buildQueryString,
  setHashString,
  getHashString,
} from "@macrostrat/ui-components";

const fmt = format(".4f");

function updateURI(state: any) {
  console.log(state);
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

  for (const filter of state.filters) {
    args[filter.type] = filter.id || filter.name;
  }

  // Update the hash in the URI
  let z = fmt(state.mapXYZ.z);
  let x = fmt(state.mapXYZ.x);
  let y = fmt(state.mapXYZ.y);

  console.log("Updating URI", state.mapXYZ);

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
      const hashData = getHashString(window.location.hash);
      console.log(window.location.hash);
      console.log(hashData);
      const { layers, x = 16, y = 23, z = 1.5 } = hashData;

      let mapState = { x, y, z };

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
        console.log("Map state is legit");
      } else {
        // Someone was naughty
        mapState = defaultState;
      }
    } catch (e) {
      // Who knows. Doesn't matter. Nothing does.
      mapState = defaultState;
    }

    dispatch(gotInitialMapState(mapState));

    if (mapState.incomingFilters && mapState.incomingFilters.length) {
      mapState.incomingFilters.forEach((f) => {
        // lith classes and types don't have unique IDs in macrostrat so we use the string
        if (f.type === "lithology_classes" || f.type === "lithology_types") {
          dispatch(
            addFilter({
              type: f.type,
              name: f.id,
            })
          );
        } else {
          dispatch(addFilter(f));
        }
      });
    }
  };
}

export { getInitialMapState, updateURI };
