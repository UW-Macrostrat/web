import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer } from "./menu";
//import { reducer as globeReducer } from "@macrostrat/cesium-viewer/actions";
//import { nadirCameraPosition } from "@macrostrat/cesium-viewer/position";
import { GOT_INITIAL_MAP_STATE, MAP_MOVED } from "../actions";
import update from "./legacy";

const reducers = combineReducers({
  // list reducers here
  menu: menuReducer,
  //globe: globeReducer,
  update,
});

function getFloat(x: any, _default = 0): number {
  const v = parseFloat(x ?? _default);
  if (isNaN(v)) {
    return _default;
  }
  return v ?? _default;
}

function overallReducer(state, action) {
  if (action.type === GOT_INITIAL_MAP_STATE || action.type == MAP_MOVED) {
    // You can access both app and inventory states here
    const x = getFloat(action.data.x, 16);
    const y = getFloat(action.data.y, 23);
    const z = getFloat(action.data.z, 1.5);
    //const destination = nadirCameraPosition(x, y, z);
    //console.log("Set globe position", destination);
    const newState = {
      ...state,
      update: {
        ...state.update,
        mapXYZ: { x, y, z },
      },
      /*
      globe: {
        ...state.globe,
        flyToProps: { destination, duration: 0, once: true },
      },
      */
    };
    //console.log(newState);
    return newState;
  }
  return state;
}

const newReducer = reduceReducers(overallReducer, reducers);

export default newReducer;
