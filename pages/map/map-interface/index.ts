import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";

import "./searchbar.styl";

import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { Provider } from "react-redux";
import { applyMiddleware, compose, createStore } from "redux";
import reducerStack, {
  AppAction,
  AppState,
  browserHistory,
  useAppState,
  useAppActions,
} from "./app-state";
import MapPage from "./map-page";

/** Redux is used only for the main map applicaton. This heavy state-management approach is
 * essentially a legacy approach, and we are moving away from this in favor of more lightweight
 * state management solutions that work on individual pages.
 */

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);

// Create the data store
let store = createStore<AppState, AppAction, any, any>(
  reducerStack,
  composeEnhancers(applyMiddleware(routerMiddleware))
);

export default function MapApp({ routerBasename }) {
  const ctx = usePageContext();
  console.log(routerBasename, ctx);

  return h(Provider, { store }, h(MapPage));
}
