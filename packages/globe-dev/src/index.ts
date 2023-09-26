import h from "@macrostrat/hyper";
import CesiumView from "./cesium-view";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useState, useMemo, useRef } from "react";
import {
  flyToParams,
  ViewInfo,
  translateCameraPosition,
  getInitialPosition,
  buildPositionHash,
  CameraParams,
  DisplayQuality,
} from "@macrostrat/cesium-viewer";
import { Link } from "~/renderer/Link";

import "./app.css";
import "cesium/Source/Widgets/widgets.css";
import "@znemz/cesium-navigation/dist/index.css";
import {
  getHashString,
  setHashString,
  buildQueryString,
} from "@macrostrat/ui-components";

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

function getStartingPosition() {
  const hash = getHashString(window.location.hash);
  if (hash == null) {
    return translateCameraPosition({
      camera: {
        lng: -118.1987,
        lat: 34,
        altitude: 280000,
      },
    });
  }
  return getInitialPosition(hash);
}

function App({ accessToken }) {
  const initialPosition = useRef(getStartingPosition());
  console.log(initialPosition);

  // next, figure out labels: mapbox://styles/jczaplewski/cl16w70qs000015qd8aw9sea5
  const style = "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n";
  const [showWireframe, setShowWireframe] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [position, setPosition] = useState<CameraParams>(
    initialPosition.current
  );

  const flyTo = useMemo(
    () =>
      flyToParams(initialPosition.current, {
        duration: 0,
      }),
    []
  );

  return h("div.globe-page", [
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
        h(
          Link,
          {
            href:
              "/map#show=satellite&hide=labels&" +
              buildQueryString(buildPositionHash(position)),
          },
          "Switch to map"
        ),
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
          displayQuality: DisplayQuality.High,
          onViewChange(cpos: ViewInfo) {
            setHashString(buildPositionHash(cpos.camera));
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
