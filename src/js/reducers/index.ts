import { combineReducers } from "redux";
import { menuReducer } from "./menu";
import { globeReducer } from "@macrostrat/cesium-viewer/src/actions";
import update from "./legacy";

const reducers = combineReducers({
  // list reducers here
  menu: menuReducer,
  globe: globeReducer,
  update,
});

export default reducers;
