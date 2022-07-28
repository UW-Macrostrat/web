import React, { createContext, useReducer, useEffect } from "react";
import { AppCtx, AppState, MAP_MODES } from "./types";
import { appReducer, useAppContextActions } from "./reducer";

let initialState: AppState = {
  project: { project_id: null, name: null, description: null },
  voronoi: { quad_seg: 2, radius: 1 },
  lines: null,
  points: null,
  columns: null,
  importOverlayOpen: true,
  isSaving: false,
  projectColumnGroups: null,
  changeSet: [],
  mode: MAP_MODES.properties,
};

const AppContext = createContext<AppCtx>({
  state: initialState,
  async runAction() {},
  updateLinesAndColumns() {},
});

function AppContextProvider(props) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const runAction = useAppContextActions(dispatch);

  function updateLinesAndColumns(project_id) {
    runAction({ type: "fetch-geometries", project_id });
  }

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
