import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer, MenuState, MenuAction } from "./menu";
import { coreReducer, CoreState, MapPosition, CoreAction } from "./core";
import { MapAction } from "./map";
import {
  reducer as globeReducer,
  GlobeAction,
  GlobeState,
  createInitialState,
  DisplayQuality,
} from "@macrostrat/cesium-viewer/actions";
import { LocalStorage } from "@macrostrat/ui-components";
import {
  nadirCameraParams,
  CameraParams,
  flyToParams,
} from "@macrostrat/cesium-viewer/position";
import { performanceReducer, PerformanceState } from "../../performance/core";

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
import { createBrowserHistory } from "history";
import { CoreAction } from "./core/actions";
import { coreReducer, CoreState } from "./core";
import { MapAction } from "./map";
import { createRouterReducer } from "@lagunovsky/redux-react-router";
import {
  ReduxRouterState,
  RouterActions,
} from "@lagunovsky/redux-react-router";

export const browserHistory = createBrowserHistory();

export type AppState = {
  core: CoreState;
  router: ReduxRouterState;
};

const routerReducer = createRouterReducer(browserHistory);

const reducers = combineReducers({
  // list reducers here
  performance: performanceReducer,
  menu: menuReducer,
  globe: storageGlobeReducer,
  router: routerReducer,
  core: coreReducer,
});

function translateCameraPosition(pos: MapPosition): CameraParams {
  const { bearing = 0, pitch, altitude } = pos.camera;
  const { zoom } = pos.target ?? {};
  if (bearing == 0 && pitch == 0 && zoom != null) {
    const { lng, lat } = pos.target;
    return nadirCameraParams(lng, lat, zoom);
  } else {
    return {
      longitude: pos.camera.lng,
      latitude: pos.camera.lat,
      height: altitude,
      heading: bearing,
      pitch: -90 + (pitch ?? 0),
      roll: 0,
    };
  }
}

type AppState = {
  core: CoreState;
  globe: GlobeState;
  performance: PerformanceState;
  menu: MenuState;
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

export type Action = CoreAction | MenuAction | MapAction | GlobeAction | RouterActions;

export default appReducer;
export * from "./core";
export * from "./map";
