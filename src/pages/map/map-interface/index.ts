import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";

import "~/styles/global.styl";
import "./searchbar.styl";
import "./ui-components.styl";

import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { Provider } from "react-redux";
import { applyMiddleware, compose, createStore } from "redux";
import reducerStack, { Action, AppState, browserHistory } from "./app-state";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);
// Create the data store
let store = createStore<AppState, Action, any, any>(
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
      [
        h(Routes, [
          //h(Route, { path: mapPagePrefix + "/sources", element: h(Sources) }),
          h(Route, { path: "*", element: h(MapPage) }),
        ]),
      ]
    )
  );
}
