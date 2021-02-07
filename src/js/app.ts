import { BrowserRouter as Router, Route, Redirect } from "react-router-dom";
import h from "@macrostrat/hyper";

import "../styles/index.styl";
import MapPage from "./map-page";
//import ColumnPage from '../../columns'

const App = () => {
  return h(Router, { basename: CESIUM_BASE_URL }, [
    h("div#app-holder", [
      h(Route, { path: "/map", component: MapPage }),
      h(Route, {
        exact: true,
        path: "/",
        render: () => h(Redirect, { to: "/map" }),
      }),
    ]),
  ]);
};

export default App;
