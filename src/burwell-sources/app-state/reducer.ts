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
  optionsOpen: false,
  optionsAnchorElement: {},
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
      return Object.assign({}, state, {
        isFetching: false,
        maps: action.maps,
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
    case "open-options":
      return Object.assign({}, state, {
        optionsOpen: true,
        optionsAnchorElement: action.optionsAnchorElement,
      });
    case "close-options":
      return Object.assign({}, state, {
        optionsOpen: false,
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
