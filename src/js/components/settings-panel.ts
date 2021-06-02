// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/ui-components";
import { useLocation } from "react-router";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";

function MapTypeButton(props) {
  const location = useLocation();
  const globeActive = location?.pathname?.startsWith("/globe");
  if (globeActive) {
    return h(LinkButton, { to: "/map" }, "Switch to map");
  }
  return h(LinkButton, { to: "/globe" }, "Switch to globe");
}

const SettingsPanel = (props) => {
  return h("div.settings", [h(MapTypeButton)]);
};

export { SettingsPanel };
