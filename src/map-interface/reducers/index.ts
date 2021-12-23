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
  nadirCameraPosition,
  CameraParams,
} from "@macrostrat/cesium-viewer/position";
import { Action, MapPosition } from "./actions";
import update from "./legacy";

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
  menu: menuReducer,
  globe: storageGlobeReducer,
  update,
});

function translateCameraPosition(pos: MapPosition): CameraParams {
  const { bearing = 0, pitch, altitude } = pos.camera;
  const { zoom } = pos.target ?? {};
  if (bearing == 0 && pitch == 0 && zoom != null) {
    const { lng, lat } = pos.target;
    return nadirCameraPosition(lng, lat, zoom);
  } else {
    return {
      longitude: pos.camera.lng,
      latitude: pos.camera.lat,
      height: altitude,
      heading: bearing,
      pitch,
      roll: 0,
    };
  }
}

function overallReducer(state, action: Action) {
  if (action.type === "got-initial-map-state" || action.type == "map-moved") {
    // You can access both app and inventory states here

    const destination = translateCameraPosition(state.update.mapPosition);
    //console.log("Set globe position", destination);
    const newState = {
      ...state,
      update: {
        ...state.update,
        mapPosition: action.data,
      },
      globe: {
        ...state.globe,
        flyToProps: { destination, duration: 0, once: true },
      },
    };
    //console.log(newState);
    return newState;
  }
  return state;
}

const newReducer = reduceReducers(overallReducer, reducers);

export default newReducer;
export * from "./hooks";
export * from "./menu";
