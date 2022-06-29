import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import h from "@macrostrat/hyper";

import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";
import "./styles/index.styl";

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

const _Sources = loadable(() => import("~/burwell-sources"));
const Sources = () => h(Suspense, { fallback: h(Spinner) }, h(_Sources));

const _MapPage = loadable(() => import("./map-interface/map-page"));
const MapPage = () => h(Suspense, { fallback: h(Spinner) }, h(_MapPage));

const App = () => {
  return h(Router, { basename: MACROSTRAT_BASE_URL }, [
    h(Routes, [
      h(Route, { path: "/sources", element: h(Sources) }),
      h(Route, { path: "/", element: h(MapPage) }),
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
  ]);
};

export default App;
