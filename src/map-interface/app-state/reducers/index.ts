import { createBrowserHistory } from "history";
import { CoreAction, coreReducer } from "./core";
import {
  contextPanelIsInitiallyOpen,
  currentPageForPathName,
} from "../nav-hooks";
import {
  createRouterReducer,
  RouterActions,
} from "@lagunovsky/redux-react-router";
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
    case "replace-state":
      return action.state;
    case "set-menu-page":
      return {
        router: state.router,
        core: coreReducer(state.core, { type: "stop-searching" }),
        menu: menuReducer(state.menu, action),
      };
    default:
      return {
        router: routerReducer(state.router, action as RouterActions),
        core: coreReducer(state.core, action as CoreAction),
        menu: menuReducer(state.menu, action as MenuAction),
      };
  }
}

const appReducer = (state: AppState, action: AppAction) => {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  return hashStringReducer(mainReducer(state, action), action);
};

export function setInfoMarkerPosition(state: AppState): AppState {
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
