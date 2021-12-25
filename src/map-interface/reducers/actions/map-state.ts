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

export type MapState = {
  mapPosition: MapPosition;
  mapHasBedrock: boolean;
  mapHasLines: boolean;
  mapHasSatellite: boolean;
  mapHasColumns: boolean;
  mapHasFossils: boolean;
  mapBackend: {
    previous: MapBackend | null;
    current: MapBackend;
  };
  mapIsLoading: boolean;
};

type MapHashData = {
  layers: MapLayer[];
  position: MapPosition;
  backend: MapBackend;
};

type MapMoved = { type: "map-moved"; data: MapPosition };
type SetMapBackend = { type: "set-map-backend"; backend: any };
type GetInitialMapState = { type: "get-initial-map-state" };
type MapLoading = { type: "map-loading" };
type MapIdle = { type: "map-idle" };
export type GotInitialMapState = {
  type: "got-initial-map-state";
  data: MapHashData;
};

export type MapAction =
  | MapMoved
  | GetInitialMapState
  | GotInitialMapState
  | SetMapBackend
  | MapLoading
  | MapIdle;
