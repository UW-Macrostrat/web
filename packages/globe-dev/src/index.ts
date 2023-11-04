import h from "@macrostrat/hyper";
import CesiumView from "./cesium-view";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
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

import "./app.scss";
import "cesium/Source/Widgets/widgets.css";
import "@znemz/cesium-navigation/dist/index.css";
import {
  getHashString,
  setHashString,
  buildQueryString,
} from "@macrostrat/ui-components";
import Map from "./map-comparison";
import {
  getMapPositionForHash,
  applyMapPositionToHash,
} from "~/map-interface/app-state/reducers/hash-string";

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

function getStartingPosition(): MapPosition {
  const hashData = getHashString(window.location.hash) ?? {};
  return getMapPositionForHash(hashData, null);
}

const _CesiumView = memo(CesiumView);

function GoogleEarthLink({ position }) {
  const base = "https://earth.google.com/web/";
  const { camera, target } = position;
  const { altitude, pitch, bearing, azimuth } = camera;
  let url = base;
  if (target == null) {
    url += `@${camera.lat},${camera.lng},${
      altitude * 100
    }d,${bearing}h,${pitch}t`;
  } else {
    const { lat, lng, distance } = target;
    url += `@${lat},${lng},${distance}d,${bearing}h,${pitch}t`;
  }

  return h("a", { href: url, target: "_blank" }, "Open in Google Earth");
}

function App({ accessToken }) {
  const initialPosition = useRef<MapPosition>(getStartingPosition());

  // next, figure out labels: mapbox://styles/jczaplewski/cl16w70qs000015qd8aw9sea5
  const style = "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n";
  const [showWireframe, setShowWireframe] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showMapbox, setShowMapbox] = useState(false);
  const [position, setPosition] = useState<MapPosition>(
    initialPosition.current
  );

  const queryString = useRef<object>({});

  useEffect(() => {
    let hashData = {};
    applyMapPositionToHash(hashData, position);
    queryString.current = buildQueryString(hashData);
    setHashString(hashData);
  }, [position]);

  const flyTo = useMemo(
    () =>
      flyToParams(translateCameraPosition(initialPosition.current), {
        duration: 0,
      }),
    []
  );

  let mapURL = "/map#show=satellite&hide=labels";
  if (queryString.current != null) {
    mapURL += "&" + queryString.current;
  }

  const onViewChange = useCallback((cpos: CameraParams) => {
    const { camera } = cpos;
    setPosition({
      camera: {
        lng: camera.longitude,
        lat: camera.latitude,
        altitude: camera.height,
        pitch: 90 + (camera.pitch ?? -90),
        bearing: camera.heading,
      },
    });
  }, []);

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
        h(VisControl, {
          name: "comparison",
          show: showMapbox,
          setShown: setShowMapbox,
        }),
        h(Link, { href: mapURL }, "Switch to map"),
        h(GoogleEarthLink, { position }, "Open in Google Earth"),
      ]),
    ]),
    h("div.map-container", [
      h("div.cesium-panel", [
        h(_CesiumView, {
          style,
          accessToken,
          flyTo,
          showWireframe,
          showInspector,
          highResolution: true,
          displayQuality: DisplayQuality.High,
          onViewChange,
        }),
      ]),
      h.if(showMapbox)("div.map-panel", [
        h(Map, {
          style: "mapbox://styles/mapbox/satellite-v9",
          accessToken,
          position,
          //onChangePosition: setPosition,
          debug: {
            showTileBoundaries: showInspector,
            showCollisionBoxes: showInspector,
            showTerrainWireframe: showWireframe,
          },
        }),
      ]),
    ]),
  ]);
}

export { App };
