import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer, MenuState } from "./menu";
import { Action } from "../actions";
import { coreReducer, CoreState } from "./core";

export type AppState = {
  core: CoreState;
  menu: MenuState;
};

const reducers = combineReducers({
  menu: menuReducer,
  core: coreReducer,
});

function overallReducer(state: AppState, action: Action): AppState {
  if (action.type === "got-initial-map-state" || action.type == "map-moved") {
    return {
      ...state,
      core: {
        ...state.core,
        mapPosition: action.data,
      },
    };
  }
  return state;
}

const appReducer = reduceReducers(overallReducer, reducers);

export * from "./menu";
export default appReducer;
