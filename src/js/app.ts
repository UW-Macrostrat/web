import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import h from "@macrostrat/hyper";

import "../styles/index.styl";
import MapPage from "./map-page";
import ColumnPage from "../columns";
import { Suspense } from "react";
import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";

const GlobeDevView = loadable(() =>
  import("./map-page/cesium-view").then((d) => d.GlobeDevPage)
);

export function GlobeDevPage(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(GlobeDevView, props));
}

const App = () => {
  return h(Router, { basename: CESIUM_BASE_URL }, [
    h("div#app-holder", [
      h(Route, { path: "/map", component: MapPage }),
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
