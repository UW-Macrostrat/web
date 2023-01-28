import { combineReducers } from "redux";
import { createBrowserHistory, Action } from "history";
import { CoreAction } from "./core/actions";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";
import {
  contextPanelIsInitiallyOpen,
  currentPageForPathName,
  isDetailPanelRoute,
} from "../nav-hooks";
import { createRouterReducer, push } from "@lagunovsky/redux-react-router";
import {
  ReduxRouterState,
  RouterActions,
} from "@lagunovsky/redux-react-router";
export const browserHistory = createBrowserHistory();
import { routerBasename } from "~/map-interface/Settings";

export enum MenuPage {
  LAYERS = "layers",
  SETTINGS = "settings",
  ABOUT = "about",
  USAGE = "usage",
  CHANGELOG = "changelog",
  EXPERIMENTS = "experiments",
}

export type MenuState = {
  activePage: MenuPage | null;
};

export type MenuAction = { type: "set-menu-page"; page: MenuPage | null };

export type AppState = {
  core: CoreState;
  router: ReduxRouterState;
  menu: MenuState;
};

const routerReducer = createRouterReducer(browserHistory);

function menuReducer(
  state: MenuState = { activePage: null },
  action: MenuAction
) {
  switch (action.type) {
    case "set-menu-page":
      return { activePage: action.page };
    default:
      return state;
  }
}

const defaultState: AppState = {
  core: coreReducer(undefined, { type: "init" }),
  router: routerReducer(undefined, { type: "init" }),
  menu: menuReducer(undefined, { type: "init" }),
};

function appReducer(
  state: AppState = defaultState,
  action: AppAction
): AppState {
  /** First, we operate over the entire state object.
   * Then, for actions that don't need to affect multiple sections of
   * state, we pass thm to individual reducers.
   */
  switch (action.type) {
    case "@@router/ON_LOCATION_CHANGED": {
      const { pathname } = action.payload.location;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      return {
        ...state,
        core: { ...state.core, menuOpen: isOpen, contextPanelOpen: isOpen },
        router: routerReducer(state.router, action),
      };
    }
    case "got-initial-map-state":
      const { pathname } = state.router.location;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      const activePage = currentPageForPathName(pathname);

      return {
        ...state,
        core: {
          ...coreReducer(state.core, action),
          menuOpen: isOpen,
          contextPanelOpen: isOpen,
        },
        menu: { activePage },
      };
    default:
      return {
        router: routerReducer(state.router, action),
        core: coreReducer(state.core, action),
        menu: menuReducer(state.menu, action),
      };
  }
}

export type AppAction = CoreAction | MapAction | RouterActions | MenuAction;

export default appReducer;
export * from "./core";
export * from "./map";
