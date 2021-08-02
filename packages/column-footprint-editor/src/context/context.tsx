import React, { createContext, useReducer, useEffect } from "react";
import { fetchColumns, fetchLines } from "./fetch";

//////////////////////// Data Types ///////////////////////

type ProjectId = { project_id: number };
type Columns = { columns: object };
type Lines = { lines: object };

/////////////////////// Async Actions ///////////////////////

type FetchColumns = { type: "fetch-columns"; payload: ProjectId };
type FetchLines = { type: "fetch-lines"; payload: ProjectId };

////////////////////// Sync Actions ///////////////////////////

type ChangeProjectId = { type: "change-project-id"; payload: ProjectId };
type ImportOverlay = { type: "import-overlay"; payload: { open: boolean } };
type IsSaving = { type: "is-saving"; payload: { isSaving: boolean } };
type SetColumns = { type: "set-columns"; payload: Columns };
type SetLines = { type: "set-lines"; payload: Lines };

////////////////////// Union Action Types //////////////////////
type SyncAppActions =
  | ChangeProjectId
  | ImportOverlay
  | IsSaving
  | SetColumns
  | SetLines;
type AsyncAppActions = FetchColumns | FetchLines;

function useAppContextActions(dispatch) {
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
      default:
        return dispatch(action);
    }
  };
}

const appReducer = (state = initialState, action: SyncAppActions) => {
  switch (action.type) {
    case "change-project-id":
      return {
        ...state,
        project_id: action.payload.project_id,
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
    default:
      console.log(action);
      throw new Error("What does this mean?");
  }
};

interface AppState {
  project_id: number;
  lines: object;
  columns: object;
  importOverlayOpen: boolean;
  isSaving: boolean;
}

let initialState: AppState = {
  project_id: null,
  lines: null,
  columns: null,
  importOverlayOpen: true,
  isSaving: false,
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
  }

  useEffect(() => {
    if (state.project_id) {
      updateLinesAndColumns(state.project_id);
      let open = state.project_id == null;
      runAction({ type: "import-overlay", payload: { open } });
    }
    return () => {};
  }, [state.project_id]);

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
