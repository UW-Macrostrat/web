import { mapPagePrefix } from "@macrostrat-web/settings";
import { createBrowserHistory } from "history";
import { matchPath } from "react-router";
import {
  contextPanelIsInitiallyOpen,
  currentPageForPathName,
} from "../nav-hooks";
import { CoreAction, coreReducer } from "./core";
import { getInitialStateFromHash, hashStringReducer } from "./hash-string";
import { AppAction, AppState, MenuAction, MenuState } from "./types";
import { pathNameAction } from "../handlers/pathname";

export const browserHistory = createBrowserHistory();

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
    case "@@INIT": {
      const route = browserHistory.location;
      const { pathname, hash } = route;
      const isOpen = contextPanelIsInitiallyOpen(pathname);
      const activePage = currentPageForPathName(pathname);
      const s1 = setInfoMarkerPosition(state, pathname);
      const [coreState, filters] = getInitialStateFromHash(s1.core, hash);

      return {
        ...s1,
        core: {
          ...s1.core,
          ...coreState,
          filtersInfo: filters,
          menuOpen: isOpen,
          contextPanelOpen: isOpen,
        },
        menu: { activePage },
      };
    }
    case "set-menu-page":
      return {
        ...state,
        core: { ...state.core, inputFocus: false },
        menu: menuReducer(state.menu, action),
      };
    default:
      return {
        core: coreReducer(state.core, action as CoreAction),
        menu: menuReducer(state.menu, action as MenuAction),
        //performance: performanceReducer(state.performance, action),
      };
  }
}

export default function appReducer(state: AppState, action: AppAction) {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  return hashStringReducer(mainReducer(state, action), action);
}

const pathChangingActions: AppAction["type"][] = [
  "set-menu-page",
  "update-cross-section",
  "update-state",
  "start-map-query",
  "close-infodrawer",
];

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
