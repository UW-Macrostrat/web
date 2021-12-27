import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer, MenuState, MenuAction } from "./menu";
import { CoreAction } from "./core/types";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";

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

export type Action = CoreAction | MenuAction | MapAction;

export default appReducer;
export * from "./core";
export * from "./menu";
export * from "./map";
