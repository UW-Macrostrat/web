import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import { formatCoordForZoomLevel } from "@macrostrat/mapbox-utils";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { format } from "d3-format";
import { Filter, FilterType } from "../handlers/filters";
import { CoreState, InfoMarkerPosition, MapLayer } from "./core";
import { AppAction, AppState } from "./types";

const fmtInt = format(".0f");

export function hashStringReducer(state: AppState, action: AppAction) {
  switch (action.type) {
    case "add-filter":
    case "remove-filter":
    case "clear-filters":
    case "toggle-map-layer":
    case "map-moved":
      updateURI(state.core);
  }
  return state;
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

export function updateURI(state: CoreState) {
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

  if (state.timeCursorAge != null && state.timeCursorAge != 0) {
    args.age = fmtInt(state.timeCursorAge);
    args.plate_model = fmtInt(state.plateModelId);
  }

  const layers = getLayerDescriptionFromLayers(state.mapLayers);
  args = { ...args, ...layers };

  setHashString(args, { arrayFormat: "comma", sort: false });
  return state;
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

function formatID(id: string, type: FilterType): string | number {
  switch (type) {
    case FilterType.AllLithologyClasses:
    case FilterType.AllLithologyTypes:
    case FilterType.LithologyClasses:
    case FilterType.LithologyTypes:
      return id;
    default:
      return Number(id);
  }
}

function getActiveFiltersFromHash(hashString: string): Filter[] {
  const hashData = getHashString(hashString) ?? {};
  let filters: Filter[] = [];
  for (const type of Object.values(FilterType)) {
    const val = hashData[type];
    if (val != null) {
      for (const v of Array.isArray(val) ? val : [val]) {
        filters.push({
          type: type as FilterType,
          id: formatID(v, type),
        });
      }
    }
  }

  return filters;
}
