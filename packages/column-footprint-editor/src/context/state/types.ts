//////////////////////// Data Types ///////////////////////

type ProjectId = { project_id: number };
type ProjectName = { name: string };
type ProjectDescription = { description: string };
type Columns = { columns: object };
type Lines = { lines: object };
type Points = { points: object };
type Project = ProjectId & ProjectName & ProjectDescription;
type VoronoiPoint = {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number]; type: "Point" };
};
type VoronoiPoints = VoronoiPoint[];
type ChangeSetItem = {
  action: ChangeSetAction;
  feature: {
    type: "Feature";
    id: string;
    properties: { id: number }; // id of line in database
    geometry: { coordinates: [number[]]; type: "MultiLineString" };
  };
};
enum ChangeSetAction {
  DRAW_CREATE = "draw.create",
  DRAW_DELETE = "draw.delete",
  CHANGE_COORDINATE = "change_coordinates",
}
export enum MAP_MODES {
  topology,
  properties,
  voronoi,
}
/////////////////////// Async Actions ///////////////////////
type FetchGeometries = { type: "fetch-geometries"; project_id: number };
type FetchVoronoiState = {
  type: "fetch-voronoi-state";
  points: VoronoiPoints;
  point: any;
  project_id: number;
  radius: number;
  quad_segs: number;
};
type SaveChangeSet = {
  type: "save-changeset";
  changeSet: ChangeSetItem[];
  project_id: number;
};

type SaveVoronoi = {
  type: "save-voronoi";
  project_id: number;
  voronoiState: VoronoiState;
};
////////////////////// Sync Actions ///////////////////////////

type ChangeProject = { type: "change-project"; payload: Project };
type ImportOverlay = { type: "import-overlay"; payload: { open: boolean } };
type IsSaving = { type: "is-saving"; payload: { isSaving: boolean } };
type SetGeometries = {
  type: "set-geometries";
  data: Columns & Lines & Points;
  mode: MAP_MODES;
};
type AddVoronoiPoints = { type: "add-voronoi-points"; point: VoronoiPoint };
type ChangeVoronoiPoint = { type: "change-voronoi-point"; point: VoronoiPoint };
type SetVoronoiState = {
  type: "set-voronoi-state";
  polygons: any;
  points: any;
};
type SetQuadSeg = { type: "set-quad-seg"; quad_seg: number };
type SetRadius = { type: "set-radius"; radius: number };
type SetMapMode = { type: "set-map-mode"; mode: MAP_MODES };
type AddToChangeSet = { type: "add-to-changeset"; item: ChangeSetItem };
type ClearChangeSet = { type: "clear-changeset" };

////////////////////// Union Action Types //////////////////////
export type SyncAppActions =
  | AddToChangeSet
  | SetMapMode
  | SetRadius
  | SetQuadSeg
  | ChangeProject
  | ImportOverlay
  | IsSaving
  | AddVoronoiPoints
  | SetVoronoiState
  | ChangeVoronoiPoint
  | SetGeometries
  | ClearChangeSet;

export type AsyncAppActions =
  | FetchGeometries
  | FetchVoronoiState
  | SaveChangeSet
  | SaveVoronoi;

export type AppActions = SyncAppActions | AsyncAppActions;

interface ProjectInterface {
  project_id: number | null;
  name: string | null;
  description: string | null;
}

interface VoronoiState {
  points?: VoronoiPoints;
  polygons?: any;
  quad_seg: number;
  radius: number;
}

interface AppState {
  project: ProjectInterface;
  voronoi: VoronoiState;
  lines: object | null;
  points: object | null;
  columns: object | null;
  importOverlayOpen: boolean;
  isSaving: boolean;
  projectColumnGroups: object[] | null;
  changeSet: ChangeSetItem[];
  mode: MAP_MODES;
}

interface AppCtx {
  state: AppState;
  runAction(action: AppActions): Promise<void>;
  updateLinesAndColumns: (e) => void;
}

export {
  AppCtx,
  AppState,
  VoronoiState,
  ProjectInterface,
  VoronoiPoint,
  ChangeSetItem,
};
