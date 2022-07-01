import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { createBrowserHistory } from "history";
import { menuReducer, MenuState, MenuAction } from "./menu";
import { CoreAction } from "./core/actions";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";
import { createRouterReducer } from "@lagunovsky/redux-react-router";
import update from "immutability-helper";
import {
  ReduxRouterState,
  RouterActions,
  push,
} from "@lagunovsky/redux-react-router";

export const browserHistory = createBrowserHistory();

export type AppState = {
  core: CoreState;
  menu: MenuState;
  router: ReduxRouterState;
};

const routerReducer = createRouterReducer(browserHistory);

const reducers = combineReducers({
  router: routerReducer,
  menu: menuReducer,
  core: coreReducer,
});

function overallReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "@@router/ON_LOCATION_CHANGED":
      const isOpen = action.payload.location.pathname != "/";
      return {
        ...state,
        core: { ...state.core, menuOpen: isOpen, contextPanelOpen: isOpen },
      };
    case "got-initial-map-state":
    case "map-moved":
      return {
        ...state,
        core: {
          ...state.core,
          mapPosition: action.data,
        },
      };
    default:
      return state;
  }
}

const appReducer = reduceReducers(overallReducer, reducers);

export type Action = CoreAction | MenuAction | MapAction | RouterActions;

export default appReducer;
export * from "./core";
export * from "./menu";
export * from "./map";
