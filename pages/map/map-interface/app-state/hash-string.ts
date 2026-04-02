import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";
import { buildQueryString, getHashString } from "@macrostrat/ui-components";
import { Filter, FilterType } from "./handlers/filters";
import {
  AppAction,
  AppState,
  InfoMarkerPosition,
  CoreState,
  MapLayer,
} from "./types";
import type { To } from "history";
import { buildPathName } from "./pathname";
import { browserHistory } from "./navigation";

export function hashStringReducer(
  prevState: AppState,
  nextState: AppState,
  action: AppAction
): void {
  let url = buildPathName(nextState);
  const hashString = buildHashString(nextState);

  // check if they match current params
  let to: To = {};

  if (browserHistory.location.pathname !== url) {
    to.pathname = url;
  }
  if (browserHistory.location.hash !== hashString) {
    to.hash = hashString;
  }

  if (Object.keys(to).length === 0) {
    // No changes to the URL are needed
    return;
  }

  // If only the hash changed, replace state
  if (to.pathname == null) {
    browserHistory.replace(to);
  } else {
    browserHistory.push(to);
  }
}

interface HashParams {
  x?: string;
  y?: string;
  z?: string;
  a?: string;
  e?: string;
}

// function getFilterDescriptor(filter: Filter): string {
//   if (filter.type.includes("lithology"))
//   return filter.id ?? filter.name;
// }

function buildHashString(state: CoreState): string {
  let args: HashParams = {};

  // Get filter information from URI.
  for (const filter of state.filters ?? []) {
    args[filter.type] ??= [];
    args[filter.type].push(filter.id ?? filter.name);
  }

  applyMapPositionToHash(args, state.mapPosition);
  applyInfoMarkerPosition(
    args,
    state.infoMarkerPosition,
    state.mapPosition.target?.zoom
  );

  const layers = getLayerDescriptionFromLayers(state.mapLayers);
  args = { ...args, ...layers };

  const hashString = buildQueryString(args, {
    arrayFormat: "comma",
    sort: false,
  });

  return hashString;
  //
  // console.log("hashString", hashString);
  //
  // setHashString(args, { arrayFormat: "comma", sort: false });
  // return state;
}

function applyInfoMarkerPosition(
  args: object,
  position: InfoMarkerPosition,
  zoom: number | null
) {
  if (position != null) {
    /* If the info marker is at the same position as the map, there
     * is no need to include it in the hash string. This should lead
     * to shorter sharable URLs */
    let infoX = formatCoordForZoomLevel(position.lng, zoom);
    let infoY = formatCoordForZoomLevel(position.lat, zoom);
    if (infoX == args["x"] || infoY == args["y"]) {
      delete args["x"];
      delete args["y"];
    }
  }
}

interface HashLayerDesc {
  show?: string[];
  hide?: string[];
}

export function getInitialStateFromHash(
  state: CoreState,
  hashString: string
): [CoreState, Filter[]] {
  const newState = updateMapPositionForHash(state, hashString);
  const filters = getActiveFiltersFromHash(hashString);
  return [newState, filters];
}

function getLayerDescriptionFromLayers(layers: Set<MapLayer>): HashLayerDesc {
  // Remove layers that should be managed by the 'hide' flag
  let layerArr: string[] = Array.from(layers).filter((lyr) => lyr != "labels");

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

  // If "geology" + "labels" are the only layers, we remove them as implicit
  if (layerArr.length == 1 && layerArr.includes("geology")) {
    layerArr = [];
  }

  let desc: HashLayerDesc = {};
  if (layerArr.length > 0) {
    desc.show = layerArr;
  }

  if (!layers.has(MapLayer.LABELS)) {
    desc.hide = ["labels"];
  }

  return desc;
}

function isValidLayer(test: string): test is MapLayer {
  const vals: string[] = Object.values(MapLayer);
  return vals.includes(test);
}

function validateLayers(layers: string[]): Set<MapLayer> {
  return new Set(layers.filter(isValidLayer));
}

const geologyLayers = ["bedrock", "lines"];

function layerDescriptionToLayers(
  layers: string | string[],
  hiddenLayers: string | string[] | null
): Set<MapLayer> {
  if (!Array.isArray(layers)) {
    layers = [layers];
  }

  if (layers.length == 0) {
    // Add implicit layers
    layers = ["geology"];
  }

  if (layers.includes("geology")) {
    layers = layers.filter((lyr) => lyr != "geology");
    layers.push(...geologyLayers);
  }

  if (layers.length == 1 && layers[0] == "none") {
    layers = [];
  }

  if (hiddenLayers != null) {
    if (!Array.isArray(hiddenLayers)) {
      hiddenLayers = [hiddenLayers];
    }
    if (!hiddenLayers.includes("labels")) {
      layers.push(MapLayer.LABELS);
    }
  }

  return validateLayers(layers);
}

export function updateMapPositionForHash(
  state: CoreState,
  hashString: string
): CoreState {
  // Get the default map state
  try {
    const hashData = getHashString(hashString) ?? {};

    let { show = [], hide = [] } = hashData;
    // Set default view parameters
    const mapLayers = layerDescriptionToLayers(show, hide);
    const position = getMapPositionForHash(hashData, state.infoMarkerPosition);

    // Get time cursor information
    const { age, plate_model = 1 } = hashData;

    return {
      ...state,
      mapPosition: position,
      mapLayers,
      timeCursorAge: age != null ? Number(age) : null,
      plateModelId: Number(plate_model),
    };
  } catch (e) {
    console.error("Invalid map state:", e);
    return state;
  }
}

function isLithologyFilterType(type: FilterType): boolean {
  return [
    FilterType.AllLithologyClasses,
    FilterType.AllLithologyTypes,
    FilterType.LithologyClasses,
    FilterType.LithologyTypes,
  ].includes(type);
}

function createTypedFilter(type: FilterType, value: string): Filter {
  const isLithology = isLithologyFilterType(type);

  return {
    type,
    id: isLithology ? value : Number(value),
  } as Filter;
}

function getActiveFiltersFromHash(hashString: string): Filter[] {
  const hashData = getHashString(hashString) ?? {};
  let filters: Filter[] = [];
  for (const type of Object.values(FilterType)) {
    const val = hashData[type];
    if (val != null) {
      for (const v of Array.isArray(val) ? val : [val]) {
        filters.push(createTypedFilter(type, v));
      }
    }
  }

  return filters;
}
