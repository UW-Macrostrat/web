import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";

import "./styles/index.styl";

import { Provider } from "react-redux";
import { createStore, compose, applyMiddleware } from "redux";
import reducerStack, {
  Action,
  browserHistory,
  AppState,
} from "./map-interface/app-state";
import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { routerBasename } from "./map-interface/settings";
import { DarkModeProvider } from "@macrostrat/ui-components";
import { WeaverPage } from "./weaver";
import { onDemand } from "./_utils";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);
// Create the data store
let store = createStore<AppState, Action, any, any>(
  reducerStack,
  composeEnhancers(applyMiddleware(routerMiddleware))
);

//const _ColumnPage = loadable(import("./columns"));
//const ColumnPage = () => h(Suspense, { fallback: h(Spinner) }, h(_ColumnPage));

/*
const _GlobeDevPage = loadable(() =>
  import("./map-page/cesium-view").then((d) => d.GlobeDevPage)
);

const GlobeDevPage = () =>
  h(Suspense, { fallback: h(Spinner) }, h(_GlobeDevPage));

function GlobePage() {
  return h(MapPage, { backend: MapBackend.CESIUM });
}
*/

const Sources = onDemand(() => import("~/burwell-sources"));
const MapPage = onDemand(() => import("./map-interface/map-page"));
const DevMapPage = onDemand(() => import("./dev"));

const App = () => {
  return h(
    DarkModeProvider,
    h(
      Provider,
      { store },
      h(
        ReduxRouter,
        { basename: routerBasename, store, history: browserHistory },
        [
          h(Routes, [
            h(Route, { path: "/sources", element: h(Sources) }),
            h(Route, {
              path: "/dev/*",
              element: h(DevMapPage),
            }),
            h(Route, { path: "*", element: h(MapPage) }),
          ]),

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
        ]
      )
    )
  );
};

export default App;
