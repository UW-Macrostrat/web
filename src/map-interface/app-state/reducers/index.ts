import { createBrowserHistory } from "history";
import { CoreAction, coreReducer } from "./core";
import { contextPanelIsInitiallyOpen } from "../nav-hooks";
import {
  createRouterReducer,
  RouterActions,
} from "@lagunovsky/redux-react-router";
import { hashStringReducer } from "./hash-string";
import { matchPath } from "react-router";
import { performanceReducer, PerformanceState } from "../../performance/core";

import { mapPagePrefix } from "~/map-interface/settings";
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

      const newRoute = action.payload.location;
      let newAction = action;
      if (newRoute.hash == "") {
        newAction = {
          ...action,
          payload: {
            ...action.payload,
            location: {
              ...action.payload.location,
              hash: state.router.location.hash,
            },
          },
        };
      }

      return {
        ...s1,
        core: { ...s1.core, menuOpen: isOpen, contextPanelOpen: isOpen },
        router: routerReducer(state.router, newAction),
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
  const loc = matchPath(
    mapPagePrefix + "/loc/:lng/:lat",
    state.router.location.pathname
  );
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

  // Check if we're viewing a cross-section
  const crossSection = matchPath(
    mapPagePrefix + "/cross-section/:loc1/:loc2",
    state.router.location.pathname
  );
  if (crossSection != null) {
    const { loc1, loc2 } = crossSection.params;
    const [lng1, lat1] = loc1.split(",").map(Number);
    const [lng2, lat2] = loc2.split(",").map(Number);
    if (lng1 != null && lat1 != null && lng2 != null && lat2 != null) {
      return {
        ...state,
        core: {
          ...state.core,
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

export default appReducer;
export * from "./core";
export * from "./map";
export * from "./types";

/*
function overallReducer(state: AppState, action: Action): AppState {
  let pos: MapPosition;
  if (action.type === "got-initial-map-state") {
    pos = action.data.mapPosition;
  } else if (action.type == "map-moved") {
    pos = action.data;
  }

  if (pos) {
    // You can access both app and globe states here
    const params = flyToParams(translateCameraPosition(pos));
    //console.log("Set globe position", destination);
    return {
      ...state,
      core: {
        ...state.core,
        mapPosition: pos,
      },
      globe: {
        ...state.globe,
        flyToProps: { ...params, duration: 0, once: true },
      },
    };
  }

  if (action.type == "map-loading" && !state.core.mapIsLoading) {
    return appReducer(state, {
      type: "reset-performance-counter",
      name: "map-loading",
    });
  }
  if (action.type == "map-idle" && state.core.mapIsLoading) {
    return appReducer(state, { type: "reset-performance-counter" });
  }

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

export type Action = CoreAction | MapAction | GlobeAction | RouterActions;

export default appReducer;
export * from "./core";
export * from "./map";
*/
