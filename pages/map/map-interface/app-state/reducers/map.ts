import { MapPosition } from "@macrostrat/mapbox-utils";

export enum MapLayer {
  SATELLITE = "satellite",
  LINES = "lines",
  COLUMNS = "columns",
  FOSSILS = "fossils",
  BEDROCK = "bedrock",
  SOURCES = "sources",
  LABELS = "labels",
  LINE_SYMBOLS = "line-symbols",
}

type MapInitialState = {
  mapPosition: MapPosition;
  mapLayers: Set<MapLayer>;
};

export type MapState = MapInitialState & {
  mapIsLoading: boolean;
};

type MapMoved = {
  type: "map-moved";
  data: {
    mapPosition: MapPosition;
  };
};

type GetInitialMapState = { type: "get-initial-map-state" };
type MapLoading = { type: "map-loading" };
type MapIdle = { type: "map-idle" };
type ToggleLayer = { type: "toggle-map-layer"; layer: MapLayer };
type ToggleMap3D = { type: "toggle-map-3d" };

export type MapAction =
  | MapMoved
  | GetInitialMapState
  | MapLoading
  | MapIdle
  | ToggleLayer
  | ToggleMap3D;
