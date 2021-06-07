// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/ui-components";
import { useLocation } from "react-router";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";

function MapTypeButton(props) {
  const { pathname, hash } = useLocation();
  const globeActive = pathname?.startsWith("/globe");
  if (globeActive) {
    return h(LinkButton, { to: { pathname: "/map", hash } }, "Switch to map");
  }
  return h(LinkButton, { to: { pathname: "/globe", hash } }, "Switch to globe");
}

const SettingsPanel = (props) => {
  return h("div.settings", [h(MapTypeButton)]);
};

export { SettingsPanel };
