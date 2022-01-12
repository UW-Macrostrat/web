//////////////// Action Types //////////////////
type FETCH_DATA = { type: "fetch-data" };
type RECIEVE_DATA = { type: "recieve-data"; maps: object[] };
type REQUEST_DATA = { type: "request-data" };
type SELECT_SCALE = { type: "select-scale"; selectedScale: any };
type SELECT_FEATURES = { type: "select-features"; selectedFeatures: any };
type ACTIVATE_FEATURE = { type: "activate-feature"; activeFeature: any };
type TOGGLE_MENU = { type: "toggle-menu"; menuOpen: boolean };

export type BurwellSourceActions =
  | FETCH_DATA
  | RECIEVE_DATA
  | REQUEST_DATA
  | SELECT_SCALE
  | SELECT_FEATURES
  | ACTIVATE_FEATURE
  | TOGGLE_MENU;

export interface BurwellState {
  isFetching: boolean;
  msg: string;
  clicks: number;
  maps: [];
  selectedScale: string;
  selectedFeatures: [];
  activeFeature: {};
  menuOpen: boolean;
}
