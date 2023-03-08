import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";
import { Route, Routes } from "react-router-dom";

import "./styles/index.styl";

import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { DarkModeProvider } from "@macrostrat/ui-components";
import { Provider } from "react-redux";
import { applyMiddleware, compose, createStore } from "redux";
import { GlobePage } from "./map-interface";
import reducerStack, {
  Action,
  AppState,
  browserHistory,
} from "./map-interface/app-state";
import { routerBasename, SETTINGS } from "./map-interface/settings";
import { onDemand } from "./_utils";

// @ts-ignore
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);
// Create the data store
let store = createStore<AppState, Action, any, any>(
  reducerStack,
  composeEnhancers(applyMiddleware(routerMiddleware))
);

//const _ColumnPage = loadable(import("./columns"));
//const ColumnPage = () => h(Suspense, { fallback: h(Spinner) }, h(_ColumnPage));

const GlobeDevPage = onDemand(() =>
  import("./map-interface/map-page/cesium-view").then((d) => d.GlobeDevPage)
);

const CesiumExample = onDemand(
  () => import("cesium-vector-provider-standalone-example")
);

const SplitMapPage = onDemand(() =>
  import("./map-interface/debug").then((d) => d.SplitMapPage)
);

const Sources = onDemand(() => import("~/burwell-sources"));
const MapPage = onDemand(() => import("./map-interface/map-page"));
const DevMapPage = onDemand(() => import("./dev"));

const AppCore = () => {
  return h(Routes, [
    h(Route, { path: "/sources", element: h(Sources) }),
    h(Route, { path: "/dev/globe", element: h(GlobeDevPage) }),
    h(Route, {
      path: "/dev/cesium-vector-provider",
      element: h(CesiumExample, {
        accessToken: SETTINGS.mapboxAccessToken,
      }),
    }),
    h(Route, { path: "/globe/*", element: h(GlobePage) }),
    h(Route, {
      path: "/dev/*",
      element: h(DevMapPage),
    }),
    h(Route, { path: "*", element: h(MapPage) }),
  ]);

  // h(Route, {
  //   path: "/globe",
  //   component: GlobePage,
  // }),
  // h(Route, { path: "/columns", component: ColumnPage }),
  //h(Route, { path: "/dev/globe", component: GlobeDevPage }),
  // h(Route, {
  //   exact: true,
  //   path: "/",
  //   render: () => h(Redirect, { to: "/map" }),
  // }),
};

const App = () => {
  return h(
    DarkModeProvider,
    h(
      Provider,
      { store },
      h(
        ReduxRouter,
        { basename: routerBasename, store, history: browserHistory },
        h(AppCore)
      )
    )
  );
};

export default App;
