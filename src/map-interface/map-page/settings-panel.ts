// Settings panel for the map

// TODO: re-integrate LinkButton to @macrostrat/router-components
import { LinkButton } from "~/map-interface/components/buttons";
import { GlobeSettings } from "@macrostrat/cesium-viewer";
import { useLocation } from "react-router";
import {
  MapBackend,
  useAppState,
  useAppActions,
} from "~/map-interface/app-state";
import { PerformanceDisplay } from "../performance";
import { Alignment, Switch, Icon } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { Tag, Button, Collapse, Callout, Text } from "@blueprintjs/core";
import { useState } from "react";
//import { LinkButton } from "@macrostrat/ui-components";
//import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { MapLayer } from "~/map-interface/app-state";
//import { DisplayQuality } from "@macrostrat/cesium-viewer";
import styles from "./settings-panel.module.styl";
import {
  DarkModeButton,
  useDarkMode,
  darkModeUpdater,
} from "@macrostrat/ui-components";

const h = hyper.styled(styles);

function useMapBackend() {
  return useAppState((d) => d.core.mapBackend);
}

function MapTypeButton(props) {
  const { hash, pathname } = useLocation();

  const globeActive = pathname?.startsWith("/globe");

  const switchLink = globeActive ? "/settings" : "/globe/settings";
  const name = globeActive ? "map" : "globe";

  return h(LinkButton, { to: switchLink }, `Switch to ${name}`);
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
  const runAction = useAppActions();
  const showExperiments = useAppState((s) => s.core.showExperimentsPanel);

  return h("div.settings", [
    h("p.info", "Display options for Macrostrat's map."),
    //h(ButtonGroup, { vertical: true, alignText: Alignment.LEFT }, [
    h(LabelsButton),
    h(ThemeButton),
    //h(HighResolutionTerrainSwitch),

    h("div.callout-panel", { className: showExperiments ? "expanded" : null }, [
      h("div.callout-header", [
        h(
          Button,
          {
            minimal: true,
            icon: "clean",
            active: showExperiments,
            intent: "warning",
            onClick() {
              runAction({ type: "toggle-experiments-panel" });
            },
          },
          "Experiments"
        ),
      ]),
      h(
        Collapse,
        {
          isOpen: showExperiments,
          className: "callout-content",
        },
        h(Callout, { intent: "warning", icon: null }, [
          h(LineSymbolsControl),
          h(SourcesButton),
        ])
      ),
    ]),
  ]);
};

function LineSymbolsControl() {
  const runAction = useAppActions();
  return h("div.control-wrapper", [
    h(
      Switch,
      {
        checked: useAppState((s) =>
          s.core.mapLayers.has(MapLayer.LINE_SYMBOLS)
        ),
        onChange() {
          runAction({ type: "toggle-map-layer", layer: MapLayer.LINE_SYMBOLS });
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
  const update = darkModeUpdater();
  const icon = darkMode.isAutoset ? "tick" : "desktop";

  const autoButton = h(
    Button,
    {
      minimal: true,
      active: darkMode.isAutoset,
      rightIcon: h(Icon, { icon, size: 12 }),
      intent: darkMode.isAutoset ? "success" : "primary",
      className: "auto-button sub-button",
      small: true,
      onClick(evt) {
        if (darkMode.isAutoset) return;
        evt.stopPropagation();
        update(null);
      },
    },

    "auto"
  );

  const darkModeText = darkMode.isEnabled
    ? "Turn on the lights"
    : "Turn off the lights";
  return h("div.dark-mode-controls", [
    h(
      DarkModeButton,
      { minimal: true, active: false, allowReset: true, rightIcon: autoButton },
      [h("span.text", darkModeText)]
    ),
  ]);
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

function HighResolutionTerrainSwitch() {
  const dispatch = useAppActions();
  return h(
    "div.control-wrapper",
    null,
    h(
      Switch,
      {
        checked: useAppState((s) => s.core.mapSettings.highResolutionTerrain),
        onChange() {
          dispatch({ type: "toggle-high-resolution-terrain" });
        },
      },
      "High-resolution terrain"
    )
  );
}

export { ExperimentsPanel, SettingsPanel, ThemeButton };
