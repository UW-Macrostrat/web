import { Route, Routes } from "react-router-dom";
import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";

import "~/styles/global.styl";
import "./searchbar.styl";
import "./ui-components.styl";

import { Provider } from "react-redux";
import { createStore, compose, applyMiddleware } from "redux";
import reducerStack, { Action, browserHistory, AppState } from "./app-state";
import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { onDemand } from "~/_utils";
import { mapPagePrefix } from "~/settings";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);
// Create the data store
let store = createStore<AppState, Action, any, any>(
  reducerStack,
  composeEnhancers(applyMiddleware(routerMiddleware))
);

import MapPage from "./map-page";

const Sources = onDemand(() => import("~/_legacy/map-sources"));
const DevMapPage = onDemand(() => import("~/_legacy/map-dev"));

export default function MapApp({ routerBasename }) {
  return h(
    Provider,
    { store },
    h(
      ReduxRouter,
      { basename: routerBasename, store, history: browserHistory },
      [
        h(Routes, [
          h(Route, { path: mapPagePrefix + "/dev/*", element: h(DevMapPage) }),
          h(Route, { path: mapPagePrefix + "/sources", element: h(Sources) }),
          h(Route, { path: "*", element: h(MapPage) }),
        ]),
      ]
    )
  );
}
