// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/router-components";
import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useLocation } from "react-router";
import { MapBackend, useAppState } from "~/map-interface/app-state";
import { PerformanceDisplay } from "../performance";

function useMapBackend() {
  return useAppState((d) => d.core.mapBackend);
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
  const data = useAppState((d) => d.performance);
  return h("div.settings", [
    h(MapTypeButton),
    h.if(globeActive)(GlobeSettings),
    h(PerformanceDisplay, { data }),
  ]);
};

export { SettingsPanel };
