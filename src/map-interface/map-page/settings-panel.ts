// Settings panel for the map

import { Alignment, Switch } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag, Button, Collapse, Callout, Text } from "@blueprintjs/core";
import { useState } from "react";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useAppState, useAppActions } from "~/map-interface/app-state";
import { useLocation } from "react-router";
import { MapLayer } from "~/map-interface/app-state";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";
import styles from "./settings-panel.module.styl";
import { DarkModeButton, useDarkMode } from "@macrostrat/ui-components";
import { LayerButton } from "../components/buttons";
import { show } from "@blueprintjs/core/lib/esm/components/context-menu/contextMenu";

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

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

const SettingsPanel = (props) => {
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  const [showExperiments, setShowExperiments] = useState(false);

  return h("div.settings", [
    h("p.info", "Display options for Macrostrat's map."),
    //h(ButtonGroup, { vertical: true, alignText: Alignment.LEFT }, [
    h(LabelsButton),
    h(ThemeButton),

    h(
      Button,
      {
        minimal: true,
        icon: "clean",
        active: showExperiments,
        intent: "danger",
        onClick() {
          setShowExperiments(!showExperiments);
        },
      },
      "Experiments"
    ),

    h(
      Collapse,
      {
        isOpen: showExperiments,
      },
      h(Callout, [h(LineSymbolsControl), h(SourcesButton)])
    ),

    //]),

    //h(MapTypeButton),
    //h.if(globeActive)(GlobeSettings),
  ]);
};

function LineSymbolsControl() {
  const runAction = useAppActions();
  return h("div.control-wrapper", [
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapShowLineSymbols),
        onChange() {
          runAction({ type: "toggle-line-symbols" });
        },
      },
      [
        h("span.control-label", [
          h("span.control-label-text", "Line symbols"),
          h(
            Tag,
            { intent: "danger", icon: "issue", minimal: true },
            "Data issues"
          ),
        ]),
      ]
    ),
    h(
      "p.admonition",
      "Geologic structure orientations are often incorrect due to inconsistent source data."
    ),
  ]);
}

function ThemeButton() {
  const darkMode = useDarkMode();

  const darkModeText = darkMode.isEnabled
    ? "Switch to light mode"
    : "Switch to dark mode";
  return h(DarkModeButton, { minimal: true, active: false }, darkModeText);
}

function LabelsButton() {
  const layer = MapLayer.LABELS;
  const isShown = useAppState((state) => state.core.mapLayers.has(layer));
  const runAction = useAppActions();
  const onClick = () => runAction({ type: "toggle-map-layer", layer });
  return h(ShowHideButton, {
    minimal: true,
    icon: "label",
    onClick,
    isShown,
    item: "basemap labels",
  });
}

function ShowHideButton({ item, isShown, ...rest }) {
  let text = isShown ? "Hide" : "Show";
  text += ` ${item}`;
  return h(Button, { active: false, ...rest }, text);
}

function SourcesButton() {
  const dispatch = useAppActions();
  return h(
    Switch,
    {
      checked: useAppState((s) => s.core.mapLayers.has(MapLayer.SOURCES)),
      onChange() {
        dispatch({ type: "toggle-map-layer", layer: MapLayer.SOURCES });
      },
    },
    "Show sources"
  );
}

export { ExperimentsPanel, SettingsPanel, ThemeButton };
