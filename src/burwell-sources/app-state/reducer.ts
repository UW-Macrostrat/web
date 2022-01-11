import { BurwellSourceActions, BurwellState } from "./types";

const burwellDefaultState: BurwellState = {
  isFetching: false,
  msg: "",
  clicks: 0,
  maps: [],
  selectedScale: "all",
  selectedFeatures: [],
  activeFeature: {},
  menuOpen: false,
  view: "map",
};

const reducer = (
  state: BurwellState = burwellDefaultState,
  action: BurwellSourceActions
) => {
  switch (action.type) {
    case "request-data":
      return Object.assign({}, state, {
        isFetching: true,
      });
    case "recieve-data":
      const maps = action.maps.map((d, i) => {
        d.id = i;
        return d;
      });
      return Object.assign({}, state, {
        isFetching: false,
        maps: maps,
      });
    case "select-scale":
      return Object.assign({}, state, {
        selectedScale: action.selectedScale,
      });
    case "select-features":
      return Object.assign({}, state, {
        selectedFeatures: action.selectedFeatures,
      });
    case "activate-feature":
      return Object.assign({}, state, {
        activeFeature: action.activeFeature,
      });
    case "toggle-menu":
      return Object.assign({}, state, {
        menuOpen: action.menuOpen,
      });
    case "change-view":
      return Object.assign({}, state, {
        view: action.view,
      });
    default:
      return state;
  }
};

export default reducer;
