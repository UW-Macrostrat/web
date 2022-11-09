// Settings panel for the map

import { Switch, Button, HTMLSelect } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag, NumericInput } from "@blueprintjs/core";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useAppState, useAppActions } from "~/map-interface/app-state";
import { useLocation } from "react-router";
import { useState, useEffect } from "react";
import { MapLayer } from "~/map-interface/app-state";
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
  const [localAge, setLocalAge] = useState(null);
  const age = useAppState((s) => s.core.timeCursorAge);
  useEffect(() => {
    setLocalAge(age);
  }, [age]);

  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.bp3-text.text-panel", [
    h("h2", "Map view settings"),
    h("p", "Advanced configuration for Macrostrat's map."),
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
    // Geologic time input
    h("div.flex-row", [
      h("h3", "Age"),

      h(NumericInput, {
        value: localAge,
        onValueChange: setLocalAge,
        min: 0,
        max: 4600,
      }),
      h(
        Button,
        {
          onClick() {
            runAction({ type: "set-time-cursor", age: localAge });
          },
        },
        "Go"
      ),
    ]),

    h("div.flex-row", [
      h("h3", "Plate model"),
      h(
        HTMLSelect,
        {
          value: useAppState((s) => s.core.plateModelId) ?? 1,
          onChange(e) {
            runAction({ type: "set-plate-model", plateModel: e.target.value });
          },
        },
        [
          h("option", { value: 1 }, "Eglington (in prep)"),
          h("option", { value: 2 }, "Seton et al., 2012"),
          h("option", { value: 3 }, "Wright et al., 2013"),
          h("option", { value: 4 }, "Scotese"),
        ]
      ),
    ]),

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

export { ExperimentsPanel, SettingsPanel };
