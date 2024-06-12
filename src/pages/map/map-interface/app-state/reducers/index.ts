import {
  RouterActions,
  createRouterReducer,
} from "@lagunovsky/redux-react-router";
import { mapPagePrefix } from "@macrostrat-web/settings";
import { createBrowserHistory } from "history";
import { matchPath } from "react-router";
import { performanceReducer } from "../../performance/core";
import { contextPanelIsInitiallyOpen } from "../nav-hooks";
import { CoreAction, coreReducer } from "./core";
import { hashStringReducer } from "./hash-string";
import { AppAction, AppState, MenuAction, MenuState } from "./types";
import { pathNameAction } from "../handlers/pathname";

export const browserHistory = createBrowserHistory();

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
  nextRouterAction: null,
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
    case "@@INIT": {
      const route = state.router.location;
      const { pathname } = route;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      const s1 = setInfoMarkerPosition(state, pathname);
      return {
        ...s1,
        core: { ...s1.core, menuOpen: isOpen, contextPanelOpen: isOpen },
      };
    }
    case "@@router/ON_LOCATION_CHANGED": {
      const newRoute = action.payload.location;
      const { pathname } = newRoute;
      const isOpen = contextPanelIsInitiallyOpen(pathname);

      const s1 = setInfoMarkerPosition(state, pathname);

      let newAction = action;
      if (newRoute.hash == "") {
        newAction = {
          ...action,
          payload: {
            ...action.payload,
            location: {
              ...action.payload.location,
              hash: s1.router.location.hash,
            },
          },
        };
      }

      return {
        ...s1,
        core: { ...s1.core, menuOpen: isOpen, contextPanelOpen: isOpen },
        router: routerReducer(s1.router, newAction),
      };
    }
    case "set-menu-page":
      return {
        ...state,
        core: { ...state.core, inputFocus: false },
        menu: menuReducer(state.menu, action),
      };
    case "replace-state":
      return action.state;
    default:
      return {
        router: routerReducer(state.router, action as RouterActions),
        core: coreReducer(state.core, action as CoreAction),
        menu: menuReducer(state.menu, action as MenuAction),
        performance: performanceReducer(state.performance, action),
        nextRouterAction: state.nextRouterAction,
      };
  }
}

export default function appReducer(state: AppState, action: AppAction) {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  return applyNextPath(hashStringReducer(mainReducer(state, action), action));
}

function applyNextPath(state: AppState): AppState {
  const action = pathNameAction(state);
  if (action == null) return state;
  console.log("Applying next path", action);
  return {
    ...state,
    nextRouterAction: action,
  };
}

export function setInfoMarkerPosition(
  state: AppState,
  pathname: string | null = null
): AppState {
  // Check if we are viewing a specific location
  const loc = matchPath(
    mapPagePrefix + "/loc/:lng/:lat/*",
    pathname ?? state.router.location.pathname
  );

  let s1 = state;

  if (loc != null) {
    const { lng, lat } = loc.params;
    return {
      ...s1,
      core: {
        ...s1.core,
        infoMarkerPosition: { lng: Number(lng), lat: Number(lat) },
        infoDrawerOpen: true,
      },
    };
  }

  // Check if we're viewing a cross-section
  const crossSection = matchPath(
    mapPagePrefix + "/cross-section/:loc1/:loc2",
    pathname ?? state.router.location.pathname
  );
  if (crossSection != null) {
    const { loc1, loc2 } = crossSection.params;
    const [lng1, lat1] = loc1.split(",").map(Number);
    const [lng2, lat2] = loc2.split(",").map(Number);
    if (lng1 != null && lat1 != null && lng2 != null && lat2 != null) {
      return {
        ...s1,
        core: {
          ...s1.core,
          crossSectionLine: {
            type: "LineString",
            coordinates: [
              [lng1, lat1],
              [lng2, lat2],
            ],
          },
          crossSectionOpen: true,
        },
      };
    }
  }

  return state;
}

export * from "./core";
export * from "./hash-string";
export * from "./map";
export * from "./types";
