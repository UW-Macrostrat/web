import { combineReducers } from "redux";
import reduceReducers from "reduce-reducers";
import { menuReducer } from "./menu";
import { reducer as globeReducer } from "@macrostrat/cesium-viewer/actions";
import { nadirCameraPosition } from "@macrostrat/cesium-viewer/position";
import { GOT_INITIAL_MAP_STATE } from "../actions";
import update from "./legacy";

const reducers = combineReducers({
  // list reducers here
  menu: menuReducer,
  globe: globeReducer,
  update
});

function overallReducer(state, action) {
  if (action.type === GOT_INITIAL_MAP_STATE) {
    // You can access both app and inventory states here
    const { x, y, z } = action.data;
    const destination = nadirCameraPosition(
      parseFloat(x),
      parseFloat(y),
      parseFloat(z)
    );
    console.log("Set globe position", destination);
    const newState = {
      ...state,
      globe: {
        ...state.globe,
        flyToProps: { destination, duration: 0, once: true }
      }
    };
    console.log(newState);
    return newState;
  }
  return state;
}

const newReducer = reduceReducers(reducers, overallReducer);

export default newReducer;
