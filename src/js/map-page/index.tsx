import React, { Suspense } from "react";
// Import other components
import MapContainer from "./map-view";
import h from "@macrostrat/hyper";
import SearchbarContainer from "../containers/SearchbarContainer";
import MenuContainer from "../containers/MenuContainer";
import InfoDrawerContainer from "../containers/InfoDrawerContainer";
import FiltersContainer from "../containers/FiltersContainer";
import ElevationChartContainer from "../containers/ElevationChartContainer";
import { ButtonGroup, Button, Spinner } from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";

const CesiumViewMod = loadable(() => import("./cesium-view"));

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
  return (
    <div id="map-page">
      <MapView backend={backend} />
      <div className="ui">
        <div className="left-stack">
          <SearchbarContainer />
          <MenuContainer />
          <FiltersContainer />
          <div className="spacer" />
        </div>
        <InfoDrawerContainer />
        <ElevationChartContainer />
      </div>
    </div>
  );
};

export { MapBackend };
export default MapPage;
