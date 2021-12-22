export type MapPosition = {
  x: number;
  y: number;
  z: number;
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
  mapXYZ: MapPosition;
  mapHasBedrock: boolean;
  mapHasLines: boolean;
  mapHasSatellite: boolean;
  mapHasColumns: boolean;
  mapHasFossils: boolean;
  mapBackend: MapBackend;
};

type MapHashData = MapPosition & {
  layers: MapLayer[];
  mapBackend: MapBackend;
};

type MapMoved = { type: "map-moved"; data: MapPosition };
type SetMapBackend = { type: "set-map-backend"; backend: any };
type GetInitialMapState = { type: "get-initial-map-state" };
export type GotInitialMapState = {
  type: "got-initial-map-state";
  data: MapHashData;
};

export type MapAction =
  | MapMoved
  | GetInitialMapState
  | GotInitialMapState
  | SetMapBackend;
