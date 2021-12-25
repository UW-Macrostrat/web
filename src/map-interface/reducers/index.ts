import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer } from "./menu";
import {
  reducer as globeReducer,
  GlobeAction,
  createInitialState,
  DisplayQuality,
} from "@macrostrat/cesium-viewer/actions";
import { LocalStorage } from "@macrostrat/ui-components";
import {
  nadirCameraParams,
  CameraParams,
  flyToParams,
} from "@macrostrat/cesium-viewer/position";
import { Action, MapPosition } from "./actions";
import updateReducer from "./legacy";
import { performanceReducer, PerformanceState } from "../performance/core";
import update from "immutability-helper";

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

const reducers = combineReducers({
  // list reducers here
  performance: performanceReducer,
  menu: menuReducer,
  globe: storageGlobeReducer,
  update: updateReducer,
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
      pitch: -90 + pitch,
      roll: 0,
    };
  }
}

type MapAppState = {
  update: UpdateState;
  globe: GlobeState;
  performance: PerformanceState;
  menu: MenuState;
};

function entryReducer(state: MapAppState, action: Action) {
  let pos: MapPosition;
  if (action.type === "got-initial-map-state") {
    pos = action.data.position;
  } else if (action.type == "map-moved") {
    pos = action.data;
  }

  if (pos) {
    // You can access both app and globe states here
    const params = flyToParams(translateCameraPosition(pos));
    //console.log("Set globe position", destination);
    return {
      ...state,
      update: {
        ...state.update,
        mapPosition: pos,
      },
      globe: {
        ...state.globe,
        flyToProps: { ...params, duration: 0, once: true },
      },
    };
  }

  if (action.type == "map-loading" && !state.update.mapIsLoading) {
    return overallReducer(state, {
      type: "reset-performance-counter",
      name: "map-loading",
    });
  }
  if (action.type == "map-idle" && state.update.mapIsLoading) {
    return overallReducer(state, { type: "reset-performance-counter" });
  }

  return state;
}

const overallReducer = reduceReducers(entryReducer, reducers);

export default overallReducer;
export * from "./hooks";
export * from "./menu";
