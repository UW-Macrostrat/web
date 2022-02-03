import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import h from "@macrostrat/hyper";

import MapPage, { MapBackend } from "./map-interface/map-page";
import { Suspense, useEffect } from "react";
import { useSelector } from "react-redux";
//import loadable from "@loadable/component";
import { Spinner } from "@blueprintjs/core";
import "./styles/index.styl";
import { useAppActions } from "~/map-interface/app-state";
import BurwellSources from "~/burwell-sources";

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

const App = () => {
  const runAction = useAppActions();
  const loaded = useSelector((state) => state.core.initialLoadComplete);
  useEffect(() => {
    runAction({ type: "get-initial-map-state" });
  }, []);

  if (!loaded) return h(Spinner);

  return h(Router, { basename: MACROSTRAT_BASE_URL }, [
    h("div#app-holder", [
      h(Route, { path: "/sources", component: BurwellSources }),
      h(Route, { path: "/", component: MapPage }),

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
    ]),
  ]);
};

export default App;
