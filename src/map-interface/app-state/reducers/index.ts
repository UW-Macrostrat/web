import { createBrowserHistory } from "history";
import { coreReducer } from "./core";
import {
  contextPanelIsInitiallyOpen,
  currentPageForPathName,
} from "../nav-hooks";
import { createRouterReducer } from "@lagunovsky/redux-react-router";
import { hashStringReducer, updateMapPositionForHash } from "./hash-string";
import { matchPath } from "react-router";

export const browserHistory = createBrowserHistory();
import { MenuState, AppState, AppAction, MenuAction } from "./types";

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

function mainReducer(
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

      let s1 = setInfoMarkerPosition(state);

      return {
        ...s1,
        core: { ...s1.core, menuOpen: isOpen, contextPanelOpen: isOpen },
        router: routerReducer(state.router, action),
      };
    }
    case "get-initial-map-state":
      const { pathname } = state.router.location;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      let s1 = setInfoMarkerPosition(state);
      let coreState = s1.core;

      const activePage = currentPageForPathName(pathname);

      // Harvest as much information as possible from the hash string
      coreState = updateMapPositionForHash(
        coreState,
        state.router.location.hash
      );

      // Fill out the remainder with defaults

      return {
        ...state,
        core: {
          ...coreState,
          menuOpen: isOpen,
          contextPanelOpen: isOpen,
          initialLoadComplete: true,
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

const appReducer = (state: AppState, action: AppAction) => {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  return hashStringReducer(mainReducer(state, action), action);
};

function setInfoMarkerPosition(state: AppState): AppState {
  // Check if we are viewing a specific location
  const loc = matchPath("/loc/:lng/:lat", state.router.location.pathname);
  if (loc != null) {
    const { lng, lat } = loc.params;
    return {
      ...state,
      core: {
        ...state.core,
        infoMarkerPosition: { lng: Number(lng), lat: Number(lat) },
        infoDrawerOpen: true,
      },
    };
  }
  return state;
}

export default appReducer;
export * from "./core";
export * from "./map";
export * from "./types";
