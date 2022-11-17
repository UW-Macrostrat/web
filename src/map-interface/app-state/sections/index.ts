import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
//import { menuReducer, MenuState, MenuAction } from "./menu";
import { coreReducer, CoreState, CoreAction } from "./core";
import { MapAction } from "./map";
import {
  reducer as globeReducer,
  GlobeAction,
  GlobeState,
  createInitialState,
  DisplayQuality,
  nadirCameraParams,
  flyToParams,
  translateCameraPosition,
} from "@macrostrat/cesium-viewer";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { LocalStorage } from "@macrostrat/ui-components";
import { performanceReducer, PerformanceState } from "../../performance/core";
import { createBrowserHistory } from "history";
import { createRouterReducer } from "@lagunovsky/redux-react-router";
import {
  ReduxRouterState,
  RouterActions,
} from "@lagunovsky/redux-react-router";

export const browserHistory = createBrowserHistory();

const globeStorage = new LocalStorage("macrostrat-globe");

function getInitialGlobeState() {
  const { displayQuality = DisplayQuality.Low } = globeStorage.get() ?? {};
  return createInitialState({ displayQuality });
}

function storageGlobeReducer(
  state = getInitialGlobeState(),
  action: GlobeAction
) {
  if (action.type === "set-display-quality") {
    globeStorage.set({ displayQuality: action.value });
  }

  return globeReducer(state, action);
}

const routerReducer = createRouterReducer(browserHistory);

const reducers = combineReducers({
  // list reducers here
  performance: performanceReducer,
  //menu: menuReducer,
  globe: storageGlobeReducer,
  router: routerReducer,
  core: coreReducer,
});

export type AppState = {
  core: CoreState;
  router: ReduxRouterState;
  globe: GlobeState;
  performance: PerformanceState;
  //menu: MenuState;
};

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
