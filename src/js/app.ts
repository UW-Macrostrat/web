import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import h from "@macrostrat/hyper";

import "../styles/index.styl";
import MapPage, { MapBackend } from "./map-page";
import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

const _ColumnPage = loadable(import("../columns"));
const ColumnPage = () => h(Suspense, { fallback: h(Spinner) }, h(_ColumnPage));

const _GlobeDevPage = loadable(() =>
  import("./map-page/cesium-view").then((d) => d.GlobeDevPage)
);

const GlobeDevPage = () =>
  h(Suspense, { fallback: h(Spinner) }, h(_GlobeDevPage));

function GlobePage() {
  return h(MapPage, { backend: MapBackend.CESIUM });
}

const App = () => {
  return h(Router, { basename: CESIUM_BASE_URL }, [
    h("div#app-holder", [
      h(Route, { path: "/map", component: MapPage }),
      h(Route, {
        path: "/globe",
        component: GlobePage,
      }),
      h(Route, { path: "/columns", component: ColumnPage }),
      h(Route, { path: "/dev/globe", component: GlobeDevPage }),
      h(Route, {
        exact: true,
        path: "/",
        render: () => h(Redirect, { to: "/map" }),
      }),
    ]),
  ]);
};

export default App;
