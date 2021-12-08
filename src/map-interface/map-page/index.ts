import React, { Suspense } from "react";
// Import other components
import MapContainer from "./map-view";
import h from "@macrostrat/hyper";
import Searchbar from "../components/searchbar";
import MenuContainer from "../components/menu";
import InfoDrawer from "../components/info-drawer";
import FiltersContainer from "../components/filters";
import ElevationChart from "../components/elevation-chart/elevation-chart";
import { ButtonGroup, Button, Spinner } from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";

//const CesiumViewMod = loadable(() => import("./cesium-view"));
const CesiumViewMod = () => h("div", "Globe is currently disabled");

export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
}

enum MapBackend {
  MAPBOX,
  CESIUM,
  MAPBOX3,
}

const MapView = (props: { backend: MapBackend }) => {
  const { backend = MapBackend.MAPBOX3 } = props;
  switch (backend) {
    case MapBackend.CESIUM:
      return h(CesiumView);
    default:
      const use3D = backend == MapBackend.MAPBOX3;
      return h(MapContainer, { use3D });
  }
};

const MapTypeSelector = () => {
  const backend = useSelector((d) => d.update.mapBackend);
  const dispatch = useDispatch();

  const setBackend = (backend) => {
    dispatch({ type: "set-map-backend", backend });
  };

  return h(ButtonGroup, { className: "map-type-selector" }, [
    h(
      Button,
      {
        active: backend == MapBackend.MAPBOX,
        onClick() {
          setBackend(MapBackend.MAPBOX);
        },
      },
      "2D"
    ),
    h(
      Button,
      {
        active: backend == MapBackend.MAPBOX3,
        onClick() {
          setBackend(MapBackend.MAPBOX3);
        },
      },
      "3D"
    ),
    h(
      Button,
      {
        active: backend == MapBackend.CESIUM,
        onClick() {
          setBackend(MapBackend.CESIUM);
        },
      },
      "Globe (alpha)"
    ),
  ]);
};

const MapPage = ({ backend = MapBackend.MAPBOX3 }) => {
  return h("div#map-page", [
    h(MapView, { backend }),
    h("div.ui", [
      h("div.left-stack", [
        h("div.panel-container", [h(Searchbar, null), h(MenuContainer, null)]),
        h("div.spacer"),
      ]),
      h(InfoDrawer, null),
      h(ElevationChart, null),
    ]),
  ]);
};

export { MapBackend };
export default MapPage;
