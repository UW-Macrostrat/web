import { state_reducer } from "./types";

const reducer = (state, action) => {
  switch (action.type) {
    case state_reducer.PROJECT_ID:
      return {
        ...state,
        project_id: action.payload.project_id,
      };
    case state_reducer.FETCH_COLUMNS:
      return {
        ...state,
        columns: action.payload.columns,
      };
    case state_reducer.FETCH_LINES:
      return {
        ...state,
        lines: action.payload.lines,
      };
    default:
      console.log(action);
      throw new Error("What does this mean?");
  }
};
export { reducer };
