// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/router-components";
import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useLocation } from "react-router";
import { useSelector } from "react-redux";
import { MapBackend } from "../reducers/actions";

function useMapBackend() {
  return useSelector((d) => d.update.mapBackend.current);
}

function MapTypeButton(props) {
  const { hash } = useLocation();

  const globeActive = useMapBackend() == MapBackend.CESIUM;
  const pathname = globeActive ? "/map" : "/globe";
  const name = globeActive ? "map" : "globe";

  return h(LinkButton, { to: { pathname, hash } }, `Switch to ${name}`);
}

const SettingsPanel = () => {
  const globeActive = useMapBackend() == MapBackend.CESIUM;
  return h("div.settings", [
    h(MapTypeButton),
    h.if(globeActive)(GlobeSettings),
  ]);
};

export { SettingsPanel };
