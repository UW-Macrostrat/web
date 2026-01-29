import {
  CameraParams,
  DisplayQuality,
  flyToParams,
  translateCameraPosition,
  GeologyLayer,
} from "@macrostrat/cesium-viewer";
import hyper from "@macrostrat/hyper";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "~/components/navigation/Link";
import CesiumView from "./cesium-view";

import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import {
  buildQueryString,
  getHashString,
  setHashString,
} from "@macrostrat/ui-components";
import "cesium/Source/Widgets/widgets.css";
import styles from "./main.module.scss";
import Map from "./map-comparison";

const h = hyper.styled(styles);

function VisControl({ show, setShown, name, children }) {
  const className = show ? "active" : "";
  return h("li.vis-control", [
    h(
      "a",
      {
        className,
        onClick() {
          setShown(!show);
        },
      },
      [show ? "Hide" : "Show", " ", name]
    ),
    children,
  ]);
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
  const [showGoogleTiles, setShowGoogleTiles] = useState(false);
  const [showMapbox, setShowMapbox] = useState(false);
  const [showGeology, setShowGeology] = useState(false);
  const [position, setPosition] = useState<MapPosition>(
    initialPosition.current
  );

  const googleMapsAPIKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const queryString = useRef<object>({});

  useEffect(() => {
    let hashData = {};
    console.log("Updated position");
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
    console.log("View changed");
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
        h(VisControl, {
          name: "Google tiles",
          show: showGoogleTiles,
          setShown: setShowGoogleTiles,
        }),
        h(VisControl, {
          name: "geology",
          show: showGeology,
          setShown: setShowGeology,
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
          showGeology,
          showGoogleTiles,
          highResolution: true,
          displayQuality: DisplayQuality.High,
          onViewChange,
          googleMapsAPIKey,
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
