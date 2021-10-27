// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/router-components";
import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useLocation } from "react-router";
import { DisplayQuality } from "@macrostrat/cesium-viewer";
import { useDispatch } from "react-redux";

function MapTypeButton(props) {
  const { pathname, hash } = useLocation();
  console.log(pathname);
  const globeActive = pathname?.startsWith("/globe");
  if (globeActive) {
    return h(LinkButton, { to: { pathname: "/map", hash } }, "Switch to map");
  }
  return h(LinkButton, { to: { pathname: "/globe", hash } }, "Switch to globe");
}

const SettingsPanel = (props) => {
  const { pathname } = useLocation();
  const globeActive = pathname?.startsWith("/globe");
  return h("div.settings", [
    h(MapTypeButton),
    h.if(globeActive)(GlobeSettings),
  ]);
};

export { SettingsPanel };
