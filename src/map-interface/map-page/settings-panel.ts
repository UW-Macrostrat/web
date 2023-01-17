// Settings panel for the map

import { Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag } from "@blueprintjs/core";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useAppState, useAppActions } from "~/map-interface/app-state";
import { useLocation } from "react-router";
import { MapLayer } from "~/map-interface/app-state";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";
import styles from "./settings-panel.module.styl";
import { DarkModeButton, useDarkMode } from "@macrostrat/ui-components";

const h = hyper.styled(styles);

function MapTypeButton(props) {
  const { pathname, hash } = useLocation();
  const globeActive = pathname?.startsWith("/globe");
  if (globeActive) {
    return h(LinkButton, { to: { pathname: "/map", hash } }, "Switch to map");
  }
  return h(LinkButton, { to: { pathname: "/globe", hash } }, "Switch to globe");
}

const ExperimentsPanel = (props) => {
  const dispatch = useAppActions();
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.experiments.bp4-text.text-panel", [
    h("h2", "Experimental settings"),
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapLayers.has(MapLayer.SOURCES)),
        onChange() {
          dispatch({ type: "toggle-map-layer", layer: MapLayer.SOURCES });
        },
      },
      "Show sources"
    ),
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapShowLineSymbols),
        onChange() {
          dispatch({ type: "toggle-line-symbols" });
        },
      },
      [
        h("span.control-label", [
          h("span.control-label-text", "Geological line symbols"),
          h(
            Tag,
            { intent: "danger", icon: "issue", minimal: true },
            "Data issues"
          ),
        ]),
      ]
    ),
    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

const SettingsPanel = (props) => {
  const runAction = useAppActions();
  const darkMode = useDarkMode();
  const darkModeText = darkMode.isEnabled
    ? "Swich to light mode"
    : "Switch to dark mode";
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.bp4-text.text-panel", [
    h("h2", "Map view settings"),
    h("p", "Advanced configuration for Macrostrat's map."),
    h(DarkModeButton, { minimal: true, small: true }, darkModeText),

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

export { ExperimentsPanel, SettingsPanel };
