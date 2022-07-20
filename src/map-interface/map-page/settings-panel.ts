// Settings panel for the map

import { Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag } from "@blueprintjs/core";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useAppState, useAppActions } from "~/map-interface/app-state";
import { useLocation } from "react-router";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";
import styles from "./settings-panel.module.styl";

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
  return h("div.settings.experiments.bp3-text.text-panel", [
    h("h2", "Experimental settings"),
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
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.bp3-text.text-panel", [
    h("h2", "Settings"),
    h(
      Switch,
      {
        large: true,
        checked: useAppState((s) => s.core.mapShowLabels),
        onChange() {
          runAction({ type: "toggle-labels" });
        },
      },
      "Map labels"
    ),

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

export { ExperimentsPanel, SettingsPanel };
