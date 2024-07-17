import { CoreState, CoreAction } from "./core";
import { MapAction } from "./map";
import {
  ReduxRouterState,
  RouterActions,
} from "@lagunovsky/redux-react-router";

export type MenuAction = { type: "set-menu-page"; page: MenuPage | null };

export enum MenuPage {
  LAYERS = "layers",
  SETTINGS = "settings",
  ABOUT = "about",
  USAGE = "usage",
  CHANGELOG = "changelog",
  EXPERIMENTS = "experiments",
}

export type MenuState = {
  activePage: MenuPage | null;
};

export type AppState = {
  core: CoreState;
  router: ReduxRouterState;
  menu: MenuState;
  nextRouterAction: RouterActions | null;
};

export type AppAction = CoreAction | MapAction | RouterActions | MenuAction;
export * from "./types";
