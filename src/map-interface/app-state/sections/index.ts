import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { createBrowserHistory, Location, Action } from "history";
import { CoreAction } from "./core/actions";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";
import { contextPanelIsInitiallyOpen, isDetailPanelRoute } from "../nav-hooks";
import { createRouterReducer, push } from "@lagunovsky/redux-react-router";
import {
  ReduxRouterState,
  RouterActions,
} from "@lagunovsky/redux-react-router";
import { routerBasename } from "~/map-interface/Settings";
export const browserHistory = createBrowserHistory();

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

const reducers = combineReducers({
  router: routerReducer,
  core: coreReducer,
  menu: menuReducer,
});

function overallReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "@@router/ON_LOCATION_CHANGED": {
      const { pathname } = action.payload.location;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      return {
        ...state,
        core: { ...state.core, menuOpen: isOpen, contextPanelOpen: isOpen },
      };
    }
    case "set-menu-page": {
      const { pathname } = state.router.location;
      let router = state.router;
      const shouldNavigateToContextPanel = isDetailPanelRoute(pathname);
      if (shouldNavigateToContextPanel) {
        const pathname = "/" + action.page ?? "";
        router = routerReducer(state.router, push(pathname));
      }
      return { ...state, menu: menuReducer(state.menu, action), router };
    }
    // case "toggle-menu": {
    //   // Push the menu onto the history stack
    //   const { pathname } = state.router.location;
    //   const isRootRoute = state.router.location.pathname == routerBasename;
    //   let dest = routerBasename;
    //   let activePage = state.menu.activePage;
    //   if (activePage == null || isRootRoute || isDetailPanelRoute(pathname)) {
    //     dest += "/layers";
    //     activePage = MenuPage.LAYERS;
    //   }
    //   return {
    //     ...state,
    //     core: coreReducer(state.core, action),
    //     router: routerReducer(state.router, push(dest + location.hash)),
    //     menu: { activePage },
    //   };
    // }
    case "got-initial-map-state":
      const { pathname } = state.router.location;
      const isOpen = contextPanelIsInitiallyOpen(pathname);

      return {
        ...state,
        core: {
          ...state.core,
          ...action.data,
          menuOpen: isOpen,
          contextPanelOpen: isOpen,
        },
      };
    case "map-moved":
      return {
        ...state,
        core: {
          ...state.core,
          ...action.data,
        },
      };
    case "close-infodrawer":
      return {
        ...state,
        router: {
          ...state.router,
          action: Action.Push,
          // Move back to the root route on infodrawer close
          location: {
            ...state.router.location,
            pathname: "/",
          },
        },
      };
    default:
      return state;
  }
}

const appReducer = reduceReducers(overallReducer, reducers);

export type AppAction = CoreAction | MapAction | RouterActions | MenuAction;

export default appReducer;
export * from "./core";
export * from "./map";
