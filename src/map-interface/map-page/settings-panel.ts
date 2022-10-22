// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/router-components";
import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useLocation } from "react-router";
import {
  MapBackend,
  useAppState,
  useAppActions,
} from "~/map-interface/app-state";
import { PerformanceDisplay } from "../performance";
import { Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag } from "@blueprintjs/core";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { MapLayer } from "~/map-interface/app-state";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";
import styles from "./settings-panel.module.styl";

const h = hyper.styled(styles);

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

const ExperimentsPanel = (props) => {
  const dispatch = useAppActions();
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.experiments.bp3-text.text-panel", [
    h("h2", "Experimental settings"),
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapShowLabels),
        onChange() {
          dispatch({ type: "toggle-labels" });
        },
      },
      "Show labels"
    ),
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
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");\
  const globeActive = useMapBackend() == MapBackend.CESIUM;
  const data = useAppState((d) => d.performance);

  return h("div.settings.bp3-text.text-panel", [
    h("h2", "Map view settings"),
    h("p", "Advanced configuration for Macrostrat's map."),
    h(MapTypeButton),
    h.if(globeActive)(GlobeSettings),
    h(PerformanceDisplay, { data }),
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapShowLabels),
        onChange() {
          runAction({ type: "toggle-labels" });
        },
      },
      "Show labels"
    ),

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

export { ExperimentsPanel, SettingsPanel };
