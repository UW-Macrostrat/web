import React, { createContext, useReducer, useEffect } from "react";
import { reducer, state_reducer, initialState } from ".";

const AppContext = createContext({});

function fetchLines(project_id, dispatch) {
  let url = `http://0.0.0.0:8000/${project_id}/lines`;

  fetch(url)
    .then((res) => res.json())
    .then((json) =>
      dispatch({ type: state_reducer.FETCH_LINES, payload: { lines: json } })
    );
}

function fetchColumns(project_id, dispatch) {
  let url = `http://0.0.0.0:8000/${project_id}/columns`;
  fetch(url)
    .then((res) => res.json())
    .then((json) => {
      dispatch({
        type: state_reducer.FETCH_COLUMNS,
        payload: { columns: json },
      });
    });
}

function useAppContextActions(dispatch) {
  return async (action) => {
    switch (action.type) {
      case "fetch-lines": {
        let project_id = action.payload.project_id;
        let url = `http://0.0.0.0:8000/${project_id}/columns`;
        console.log("made it this far");
        fetch(url)
          .then((res) => res.json())
          .then((json) => {
            console.log(json);
            dispatch({
              type: state_reducer.FETCH_COLUMNS,
              payload: { columns: json },
            });
          });
      }
      case "fetch-columns": {
        let project_id = action.payload.project_id;
        let url = `http://0.0.0.0:8000/${project_id}/lines`;
        fetch(url)
          .then((res) => res.json())
          .then((json) =>
            dispatch({
              type: state_reducer.FETCH_LINES,
              payload: { lines: json },
            })
          );
      }
      default:
        return dispatch(action);
    }
  };
}

function AppContextProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const runAction = useAppContextActions(dispatch);

  function updateLinesAndColumns() {
    const project_id = state.project_id;
    runAction({ type: "fetch-lines", payload: { project_id } });
    runAction({ type: "fetch-columns", payload: { project_id } });
  }

  useEffect(() => {
    if (state.project_id) {
      fetchLines(state.project_id, dispatch);
      fetchColumns(state.project_id, dispatch);
    }
    return () => {};
  }, [state.project_id]);

  return (
    <AppContext.Provider
      value={{
        state,
        state_reducer,
        dispatch,
        runAction,
        fetchColumns,
        fetchLines,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
}

export { AppContextProvider, AppContext };
