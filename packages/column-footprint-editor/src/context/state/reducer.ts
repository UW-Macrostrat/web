import { Dispatch } from "react";
import { SyncAppActions, AppActions, AppState, MAP_MODES } from "./types";
import {
  fetchColumns,
  fetchLines,
  fetchPoints,
  fetchVoronoiPolygons,
  saveLines,
  saveVoronoiPolygons,
} from "./fetch";

function useAppContextActions(dispatch: Dispatch<SyncAppActions>) {
  return async (action: AppActions) => {
    switch (action.type) {
      case "fetch-geometries": {
        const project_id = action.project_id;
        const lines = await fetchLines(project_id);
        const columns = await fetchColumns(project_id);
        const points = await fetchPoints(project_id);
        return dispatch({
          type: "set-geometries",
          data: { lines, columns, points },
          mode: MAP_MODES.properties,
        });
      }
      case "fetch-voronoi-state":
        // should just take in points
        const { project_id, points, point } = action;
        if (points.length == 0) {
          if (!point) {
            return dispatch({
              type: "set-voronoi-state",
              polygons: [],
              points: [],
            });
          }
        }
        let points_ = JSON.parse(JSON.stringify(points));
        if (point) {
          points_.push(point);
        }
        // this function should return polygons and points
        const data = await fetchVoronoiPolygons(
          project_id,
          points_,
          action.radius,
          action.quad_segs
        );
        return dispatch({
          type: "set-voronoi-state",
          polygons: data,
          points: [...points_],
        });
      case "save-changeset":
        // save changeSet stuff
        await saveLines(action.changeSet, action.project_id);
        const lines_ = await fetchLines(action.project_id);
        const columns_ = await fetchColumns(action.project_id);
        const _points = await fetchPoints(action.project_id);
        return dispatch({
          type: "set-geometries",
          data: { lines: lines_, columns: columns_, points: _points },
          mode: MAP_MODES.topology,
        });
      case "save-voronoi":
        await saveVoronoiPolygons(
          action.project_id,
          action.voronoiState.points,
          action.voronoiState.radius,
          action.voronoiState.quad_seg
        );
        const _lines_ = await fetchLines(action.project_id);
        const _columns_ = await fetchColumns(action.project_id);
        const _points_ = await fetchPoints(action.project_id);
        return dispatch({
          type: "set-geometries",
          data: { lines: _lines_, columns: _columns_, points: _points_ },
          mode: MAP_MODES.topology,
        });
      default:
        return dispatch(action);
    }
  };
}

const appReducer = (state: AppState, action: SyncAppActions) => {
  switch (action.type) {
    case "change-project":
      return {
        ...state,
        project: action.payload,
      };
    case "set-geometries":
      return {
        ...state,
        columns: action.data.columns,
        lines: action.data.lines,
        points: action.data.points,
        changeSet: [],
        voronoi: { ...state.voronoi, polygons: [], points: [] },
        mode: action.mode,
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
    case "set-quad-seg":
      return {
        ...state,
        voronoi: {
          ...state.voronoi,
          quad_seg: action.quad_seg,
        },
      };
    case "set-radius":
      return {
        ...state,
        voronoi: {
          ...state.voronoi,
          radius: action.radius,
        },
      };
    case "add-to-changeset":
      return {
        ...state,
        changeSet: [...state.changeSet, action.item],
      };
    case "clear-changeset":
      return {
        ...state,
        changeSet: [],
      };
    case "set-map-mode":
      return { ...state, mode: action.mode };
    default:
      throw new Error("What does this mean?");
  }
};

export { appReducer, useAppContextActions };
