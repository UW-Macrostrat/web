type LatLng = {
  lng: number;
  lat: number;
};

type TargetPosition = LatLng & {
  zoom: number;
};

type CameraPosition = LatLng & {
  bearing?: number;
  pitch?: number;
  altitude: number;
};

export type MapPosition = {
  camera: CameraPosition;
  target?: TargetPosition;
};

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
}

type MapInitialState = {
  mapPosition: MapPosition;
  mapBackend: MapBackend;
  mapLayers: Set<MapLayer>;
};

export type MapState = MapInitialState & {
  mapIsLoading: boolean;
};

type MapMoved = { type: "map-moved"; data: MapPosition };
type SetMapBackend = { type: "set-map-backend"; backend: any };
type GetInitialMapState = { type: "get-initial-map-state" };
type MapLoading = { type: "map-loading" };
type MapIdle = { type: "map-idle" };
type ToggleLayer = { type: "toggle-map-layer"; layer: MapLayer };
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
  | ToggleMap3D;
