import { Suspense } from "react";
// Import other components
import MapContainer from "./map-view";
import hyper, { compose } from "@macrostrat/hyper";
import Searchbar, { SearchResults } from "../components/searchbar";
import MenuContainer from "./menu";
import InfoDrawer from "../components/info-drawer";
import ElevationChart from "../components/elevation-chart";
import {
  ButtonGroup,
  Button,
  Spinner,
  Collapse,
  HotkeysProvider,
} from "@blueprintjs/core";
import { useSelector, useDispatch } from "react-redux";
import loadable from "@loadable/component";
import { useSearchState, MapBackend } from "../app-state";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

//const CesiumViewMod = loadable(() => import("./cesium-view"));
const CesiumViewMod = () => h("div", "Globe is currently disabled");

export function CesiumView(props) {
  return h(Suspense, { fallback: h(Spinner) }, h(CesiumViewMod, props));
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
  const { inputFocus } = useSearchState();

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost */
  const className = inputFocus ? "searching" : null;

  return h("div.map-page", [
    h("div.main-ui", [
      h(MapView, { backend }),
      h("div.panels-overlay", { className }, [
        h("div.left-stack", [
          h("div.panel-container", [
            h(Searchbar, null),
            h(Collapse, { isOpen: inputFocus }, [h(SearchResults)]),
            h.if(!inputFocus)(MenuContainer, null),
          ]),
        ]),
        h(InfoDrawer, null),
      ]),
    ]),
    h("div.bottom", null, h(ElevationChart, null)),
  ]);
};

const _MapPage = compose(HotkeysProvider, MapPage);

export { MapBackend };
export default _MapPage;
