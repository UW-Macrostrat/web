// Settings panel for the map

import { Switch } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useAppState, useAppActions } from "~/map-interface/app-state";
import { useLocation } from "react-router";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";

function MapTypeButton(props) {
  const { pathname, hash } = useLocation();
  const globeActive = pathname?.startsWith("/globe");
  if (globeActive) {
    return h(LinkButton, { to: { pathname: "/map", hash } }, "Switch to map");
  }
  return h(LinkButton, { to: { pathname: "/globe", hash } }, "Switch to globe");
}

const SettingsPanel = (props) => {
  const checked = useAppState((s) => s.core.mapShowLabels);
  const dispatch = useAppActions();
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings", [
    h("h2", "Experimental settings"),
    h(
      Switch,
      {
        checked,
        onChange() {
          dispatch({ type: "toggle-labels" });
        },
      },
      "Show labels"
    ),
    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

export { SettingsPanel };
