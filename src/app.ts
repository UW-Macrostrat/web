import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ReduxRouter } from "@lagunovsky/redux-react-router";
import h from "@macrostrat/hyper";

import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";
import "./styles/index.styl";
import { MapBackend } from "~/map-interface/app-state";

import { Provider } from "react-redux";
import { createStore, compose, applyMiddleware } from "redux";
import reducerStack, {
  Action,
  browserHistory,
  AppState,
} from "./map-interface/app-state";
import { createRouterMiddleware } from "@lagunovsky/redux-react-router";
import { routerBasename } from "./map-interface/Settings";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const routerMiddleware = createRouterMiddleware(browserHistory);
// Create the data store
let store = createStore<AppState, Action, any, any>(
  reducerStack,
  composeEnhancers(applyMiddleware(routerMiddleware))
);

//const _ColumnPage = loadable(import("./columns"));
//const ColumnPage = () => h(Suspense, { fallback: h(Spinner) }, h(_ColumnPage));

const _GlobeDevPage = loadable(() =>
  import("./map-interface/map-page/cesium-view").then((d) => d.GlobeDevPage)
);

const GlobeDevPage = () =>
  h(Suspense, { fallback: h(Spinner) }, h(_GlobeDevPage));

function GlobePage() {
  return h(MapPage, { backend: MapBackend.CESIUM, baseRoute: "/globe/" });
}

const _Sources = loadable(() => import("~/burwell-sources"));
const Sources = () => h(Suspense, { fallback: h(Spinner) }, h(_Sources));

const _MapPage = loadable(() => import("./map-interface/map-page"));
const MapPage = (props) =>
  h(Suspense, { fallback: h(Spinner) }, h(_MapPage, props));

const App = () => {
  return h(
    Provider,
    { store },
    h(
      ReduxRouter,
      { basename: routerBasename, store, history: browserHistory },
      [
        h(Routes, [
          h(Route, { path: "/sources", element: h(Sources) }),
          h(Route, { path: "/dev/globe", element: h(GlobeDevPage) }),
          h(Route, { path: "/globe/*", element: h(GlobePage) }),
          h(Route, { path: "*", element: h(MapPage) }),
        ]),

        // if (!loaded) return h(Spinner);

        // return h(Router, { basename: MACROSTRAT_BASE_URL }, [
        //   h("div#app-holder", [
        //     h(Route, { path: ["/map", "/globe"], component: MapPage }),
        //     h(Route, { path: "/columns", component: ColumnPage }),
        //     h(Route, { path: "/dev/globe", component: GlobeDevPage }),
        //     h(Route, {
        //       exact: true,
        //       path: "/",
        //       render: () => h(Redirect, { to: "/map" }),
        //     }),
        //   ]),
        // ]);
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
  );
};

export default App;
