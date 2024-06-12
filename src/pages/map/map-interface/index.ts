import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";
import { useEffect } from "react";

import "~/styles/global.styl";
import "./searchbar.styl";
import "./ui-components.styl";

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

import MapPage from "./map-page";

export default function MapApp({ routerBasename }) {
  return h(
    Provider,
    { store },
    h(
      ReduxRouter,
      { basename: routerBasename, store, history: browserHistory },
      [h(Routes, [h(Route, { path: "*", element: h(MapPage) })]), h(RouterSync)]
    )
  );
}

function RouterSync() {
  /** This is a temporary solution to sync the store with the history object. */
  const nextRouterAction = useAppState((state) => state.nextRouterAction);
  const runAction = useAppActions();
  useEffect(() => {
    if (nextRouterAction != null) {
      console.log("Dispatching next router action", nextRouterAction);
      runAction(nextRouterAction);
    }
  }, [nextRouterAction]);
  return null;
}

// Extend the window type to include the Redux DevTools types
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: Function | undefined;
  }
}
