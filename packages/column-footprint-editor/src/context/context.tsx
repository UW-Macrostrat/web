import React, { createContext, useReducer, useEffect } from "react";
import { reducer, state_reducer, initialState } from ".";

const AppContext = createContext({});

function fetchLines(project_id, dispatch) {
  let url = `http://0.0.0.0:8000/lines/${project_id}`;

  fetch(url)
    .then((res) => res.json())
    .then((json) =>
      dispatch({ type: state_reducer.FETCH_LINES, payload: { lines: json } })
    );
}

function fetchColumns(project_id, dispatch) {
  let url = `http://0.0.0.0:8000/columns/${project_id}`;
  fetch(url)
    .then((res) => res.json())
    .then((json) => {
      dispatch({
        type: state_reducer.FETCH_COLUMNS,
        payload: { columns: json },
      });
    });
}

function AppContextProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.project_id) {
      fetchLines(state.project_id, dispatch);
      fetchColumns(state.project_id, dispatch);
    }
    return () => {};
  }, [state.project_id]);

  return (
    <AppContext.Provider
      value={{ state, dispatch, state_reducer, fetchColumns, fetchLines }}
    >
      {props.children}
    </AppContext.Provider>
  );
}

export { AppContextProvider, AppContext };
