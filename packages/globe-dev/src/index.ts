import h from "@macrostrat/hyper";
import CesiumView from "./cesium-view";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useState, useMemo } from "react";
import {
  flyToParams,
  ViewInfo,
  translateCameraPosition,
} from "@macrostrat/cesium-viewer";

import "./app.css";
import "cesium/Source/Widgets/widgets.css";
import "@znemz/cesium-navigation/dist/index.css";

function VisControl({ show, setShown, name }) {
  const className = show ? "active" : "";
  return h(
    "li",
    h(
      "a",
      {
        className,
        onClick() {
          setShown(!show);
        },
      },
      [show ? "Hide" : "Show", " ", name]
    )
  );
}

function App({ accessToken }) {
  // next, figure out labels: mapbox://styles/jczaplewski/cl16w70qs000015qd8aw9sea5
  const style = "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n";
  const [showWireframe, setShowWireframe] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [position, setPosition] = useState<MapPosition>({
    camera: {
      lng: 16.1987,
      lat: -24.2254,
      altitude: 100000,
    },
  });

  const flyTo = useMemo(
    () =>
      flyToParams(translateCameraPosition(position), {
        duration: 0,
      }),
    []
  );

  return h("div.example-app", [
    h("header", [
      h("h1", "Macrostrat globe"),
      h("ul.controls", [
        h(VisControl, {
          name: "inspector",
          show: showInspector,
          setShown: setShowInspector,
        }),
        h(VisControl, {
          name: "wireframe",
          show: showWireframe,
          setShown: setShowWireframe,
        }),
      ]),
    ]),
    h("div.map-container", [
      h("div.cesium-container.map-sizer", [
        h(CesiumView, {
          style,
          accessToken,
          flyTo,
          showWireframe,
          showInspector,
          highResolution: true,
          onViewChange(cpos: ViewInfo) {
            //const { camera } = cpos;
            // setPosition({
            //   camera: {
            //     lng: camera.longitude,
            //     lat: camera.latitude,
            //     altitude: camera.height,
            //     pitch: 90 + (camera.pitch ?? -90),
            //     bearing: camera.heading,
            //   },
            // });
          },
        }),
      ]),
    ]),
  ]);
}

export { App };
