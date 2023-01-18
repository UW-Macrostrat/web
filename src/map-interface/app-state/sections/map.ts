import { MapPosition } from "@macrostrat/mapbox-utils";

export enum MapBackend {
  MAPBOX,
  CESIUM,
  MAPBOX3,
}

export enum MapLayer {
  SATELLITE = "satellite",
  LINES = "lines",
  COLUMNS = "columns",
  FOSSILS = "fossils",
  BEDROCK = "bedrock",
  SOURCES = "sources",
  LABELS = "labels",
}

type MapInitialState = {
  mapPosition: MapPosition;
  mapBackend: MapBackend;
  mapLayers: Set<MapLayer>;
  mapShowLineSymbols: boolean;
};

export type MapState = MapInitialState & {
  mapIsLoading: boolean;
};

export enum PositionFocusState {
  CENTERED,
  NEAR_CENTER,
  OFF_CENTER,
  OUT_OF_PADDING,
  OUT_OF_VIEW,
}

type MapMoved = {
  type: "map-moved";
  data: {
    mapPosition: MapPosition;
    infoMarkerFocus: PositionFocusState | null;
  };
};
type SetMapBackend = { type: "set-map-backend"; backend: any };
type GetInitialMapState = { type: "get-initial-map-state" };
type MapLoading = { type: "map-loading" };
type MapIdle = { type: "map-idle" };
type ToggleLayer = { type: "toggle-map-layer"; layer: MapLayer };
type ToggleLineSymbols = { type: "toggle-line-symbols" };
type ToggleMap3D = { type: "toggle-map-3d" };

export type GotInitialMapState = {
  type: "got-initial-map-state";
  data: MapInitialState;
};

export type MapAction =
  | MapMoved
  | GetInitialMapState
  | GotInitialMapState
  | SetMapBackend
  | MapLoading
  | MapIdle
  | ToggleLayer
  | ToggleLineSymbols
  | ToggleMap3D;
