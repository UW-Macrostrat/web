import React, { createContext, useReducer, useEffect, Dispatch } from "react";
import {
  fetchColumns,
  fetchLines,
  fetchPoints,
  fetchVoronoiPolygons,
} from "./fetch";

//////////////////////// Data Types ///////////////////////

type ProjectId = { project_id: number };
type ProjectName = { name: string };
type ProjectDescription = { description: string };
type Columns = { columns: object };
type Lines = { lines: object };
type Points = { points: object };
type Project = ProjectId & ProjectName & ProjectDescription;
type VoronoiPoint = object;
type VoronoiPoints = VoronoiPoint[];

/////////////////////// Async Actions ///////////////////////

type FetchColumns = { type: "fetch-columns"; payload: ProjectId };
type FetchLines = { type: "fetch-lines"; payload: ProjectId };
type FetchPoints = { type: "fetch-points"; payload: ProjectId };
type FetchVoronoiState = {
  type: "fetch-voronoi-state";
  points: VoronoiPoints;
  point: any;
  project_id: number;
};

////////////////////// Sync Actions ///////////////////////////

type ChangeProject = { type: "change-project"; payload: Project };
type ImportOverlay = { type: "import-overlay"; payload: { open: boolean } };
type IsSaving = { type: "is-saving"; payload: { isSaving: boolean } };
type SetColumns = { type: "set-columns"; payload: Columns };
type SetLines = { type: "set-lines"; payload: Lines };
type SetPoints = { type: "set-points"; payload: Points };
type AddVoronoiPoints = { type: "add-voronoi-points"; point: VoronoiPoint };
type ChangeVoronoiPoint = { type: "change-voronoi-point"; point: VoronoiPoint };
type SetVoronoiState = {
  type: "set-voronoi-state";
  polygons: any;
  points: any;
};

////////////////////// Union Action Types //////////////////////
type SyncAppActions =
  | ChangeProject
  | ImportOverlay
  | IsSaving
  | SetColumns
  | SetLines
  | SetPoints
  | AddVoronoiPoints
  | SetVoronoiState
  | ChangeVoronoiPoint;

type AsyncAppActions =
  | FetchColumns
  | FetchLines
  | FetchPoints
  | FetchVoronoiState;

function useAppContextActions(dispatch: Dispatch<SyncAppActions>) {
  // maybe state and action??
  return async (action: SyncAppActions | AsyncAppActions) => {
    switch (action.type) {
      case "fetch-lines": {
        const project_id = action.payload.project_id;
        const lines = await fetchLines(project_id);
        return dispatch({ type: "set-lines", payload: { lines } });
      }
      case "fetch-columns": {
        const project_id = action.payload.project_id;
        const columns = await fetchColumns(project_id);
        return dispatch({ type: "set-columns", payload: { columns } });
      }
      case "fetch-points": {
        const project_id = action.payload.project_id;
        const points = await fetchPoints(project_id);
        return dispatch({ type: "set-points", payload: { points } });
      }
      case "fetch-voronoi-state":
        const { project_id, points, point } = action;
        if (points.length == 0) {
          return dispatch({
            type: "set-voronoi-state",
            polygons: [],
            points: [point],
          });
        }
        const points_ = JSON.parse(JSON.stringify(points)).map(
          (point) => point.geometry.coordinates
        );
        const data = await fetchVoronoiPolygons(project_id, [
          ...points_,
          point.geometry.coordinates,
        ]);
        return dispatch({
          type: "set-voronoi-state",
          polygons: data,
          points: [...points, point],
        });
      default:
        return dispatch(action);
    }
  };
}

const appReducer = (state = initialState, action: SyncAppActions) => {
  switch (action.type) {
    case "change-project":
      return {
        ...state,
        project: action.payload,
      };
    case "set-columns":
      return {
        ...state,
        columns: action.payload.columns,
      };
    case "set-lines":
      return {
        ...state,
        lines: action.payload.lines,
      };
    case "set-points":
      return {
        ...state,
        points: action.payload.points,
      };
    case "import-overlay":
      return {
        ...state,
        importOverlayOpen: action.payload.open,
      };
    case "is-saving":
      return {
        ...state,
        isSaving: action.payload.isSaving,
      };
    case "add-voronoi-points":
      const curVoronoiPoints = state.voronoi.points ?? [];
      const newVoronoiPoints = [...curVoronoiPoints, action.point];
      return {
        ...state,
        voronoi: {
          ...state.voronoi,
          points: newVoronoiPoints,
        },
      };
    case "set-voronoi-state":
      return {
        ...state,
        voronoi: {
          ...state.voronoi,
          polygons: action.polygons,
          points: action.points,
        },
      };
    case "change-voronoi-point":
      const currentPoints = state.voronoi.points ?? [];
      if (currentPoints.length > 0) {
        let idx;
        currentPoints.map((p, i) => {
          if (p.id == action.point.id) {
            idx = i;
          }
        });
        const points = JSON.parse(JSON.stringify(currentPoints));
        points.splice(idx, 1, action.point);
        return {
          ...state,
          voronoi: {
            ...state.voronoi,
            points,
          },
        };
      }
      return {
        ...state,
        voronoi: {
          ...state.voronoi,
          points: [action.point],
        },
      };
    default:
      throw new Error("What does this mean?");
  }
};
interface ProjectInterface {
  project_id: number | null;
  name: string | null;
  description: string | null;
}

interface VoronoiState {
  points?: VoronoiPoints;
  polygons?: any;
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
}

let initialState: AppState = {
  project: { project_id: null, name: null, description: null },
  voronoi: {},
  lines: null,
  points: null,
  columns: null,
  importOverlayOpen: true,
  isSaving: false,
  projectColumnGroups: null,
};

interface AppCtx {
  state: AppState;
  runAction(action: SyncAppActions | AsyncAppActions): Promise<void>;
  updateLinesAndColumns: (e) => void;
}
const AppContext = createContext<AppCtx>({
  state: initialState,
  async runAction() {},
  updateLinesAndColumns() {},
});

function AppContextProvider(props) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const runAction = useAppContextActions(dispatch);

  function updateLinesAndColumns(project_id) {
    runAction({ type: "fetch-lines", payload: { project_id } });
    runAction({ type: "fetch-columns", payload: { project_id } });
    runAction({ type: "fetch-points", payload: { project_id } });
  }
  console.log(state.voronoi);

  useEffect(() => {
    if (state.project.project_id) {
      updateLinesAndColumns(state.project.project_id);
      let open = state.project.project_id == null;
      runAction({ type: "import-overlay", payload: { open } });
    }
    return () => {};
  }, [state.project.project_id]);

  return (
    <AppContext.Provider
      value={{
        state,
        runAction,
        updateLinesAndColumns,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
}

export { AppContextProvider, AppContext };
