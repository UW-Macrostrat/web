import { setHashString, getHashString } from "@macrostrat/ui-components";
import { MapBackend, MapLayer, CoreState } from "./core";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { AppState, AppAction } from "./types";
import { Filter, FilterType } from "../handlers/filters";
import {
  formatCoordForZoomLevel,
  fmtInt,
  fmt1,
  fmt2,
} from "~/map-interface/utils/formatting";

export function hashStringReducer(state: AppState, action: AppAction) {
  switch (action.type) {
    case "set-map-backend":
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
  for (const filter of state.filters) {
    args[filter.type] ??= [];
    args[filter.type].push(filter.id ?? filter.name);
  }

  applyXYPosition(args, state);
  applyHeightAndOrientation(args, state);

  const layers = getLayerDescriptionFromLayers(state.mapLayers);
  args = { ...args, ...layers };

  setHashString(args, { arrayFormat: "comma", sort: false });
  return state;
}

function applyXYPosition(args: object, state: CoreState) {
  const pos = state.mapPosition.camera;
  if (pos == null) return;
  const zoom = state.mapPosition.target?.zoom;

  let x = formatCoordForZoomLevel(pos.lng, zoom);
  let y = formatCoordForZoomLevel(pos.lat, zoom);

  const { infoMarkerPosition } = state;
  if (infoMarkerPosition != null) {
    /* If the info marker is at the same position as the map, there
     * is no need to include it in the hash string. This should lead
     * to shorter sharable URLs */
    let infoX = formatCoordForZoomLevel(infoMarkerPosition.lng, zoom);
    let infoY = formatCoordForZoomLevel(infoMarkerPosition.lat, zoom);
    if (infoX == x || infoY == y) {
      return;
    }
  }
  args["x"] = x;
  args["y"] = y;
}

function applyHeightAndOrientation(args: HashParams, state: CoreState) {
  const pos = state.mapPosition.camera ?? {
    bearing: 0,
    pitch: 0,
    altitude: null,
  };
  const zoom = state.mapPosition.target?.zoom;

  if (pos.bearing == 0 && pos.pitch == 0 && zoom != null) {
    args.z = fmt1(zoom);
  } else if (pos.altitude != null) {
    if (pos.altitude > 5000) {
      args.z = fmt2(pos.altitude / 1000) + "km";
    } else {
      args.z = fmtInt(pos.altitude) + "m";
    }
  }
  if (pos.bearing != 0) {
    let az = pos.bearing;
    if (az < 0) az += 360;
    args.a = fmtInt(az);
  }
  if (pos.pitch != 0) {
    args.e = fmtInt(pos.pitch);
  }
}

function _fmt(x: string | number | string[]) {
  if (Array.isArray(x)) {
    x = x[0];
  }
  return parseFloat(x.toString());
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
    const {
      x = state.infoMarkerPosition?.lng ?? 16,
      y = state.infoMarkerPosition?.lat ?? 23,
      // Different default for zoom depending on whether we have a marker
      z = state.infoMarkerPosition != null ? 7 : 2,
      a = 0,
      e = 0,
    } = hashData;

    const mapLayers = layerDescriptionToLayers(show, hide);

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
      ...state,
      mapPosition: position,
      mapLayers,
      mapBackend: MapBackend.MAPBOX3,
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
