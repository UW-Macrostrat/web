import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { createBrowserHistory } from "history";
import { menuReducer, MenuState, MenuAction } from "./menu";
import { CoreAction } from "./core/actions";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";
import { createRouterReducer } from "@lagunovsky/redux-react-router";

export const browserHistory = createBrowserHistory();

export type AppState = {
  core: CoreState;
  menu: MenuState;
};

const reducers = combineReducers({
  router: createRouterReducer(browserHistory),
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
