// Settings panel for the map

// TODO: re-integrate LinkButton to @macrostrat/router-components
import { Button, Switch, Tag } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "#/map/map-interface/app-state";

import h from "./settings-panel.module.sass";
import { ThemeButton } from "~/components/theme-button.ts";
import { ExpandablePanel } from "~/components";
import { CompilationSelect } from "./compilation-select";

const ExperimentsPanel = (props) => {
  const dispatch = useAppActions();
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.experiments.bp6-text.text-panel", [
    h("h2", "Experimental settings"),
    h(
      Switch,
      {
        checked: useAppState((s) => s.mapLayers.has(MapLayer.SOURCES)),
        onChange() {
          dispatch({ type: "toggle-map-layer", layer: MapLayer.SOURCES });
        },
      },
      "Show sources"
    ),
  ]);
};

const SettingsPanel = (props) => {
  const runAction = useAppActions();
  const showExperiments = useAppState((s) => s.showExperimentsPanel);
  const age = useAppState((s) => s.timeCursorAge);
  const [localAge, setLocalAge] = useState(age);

  useEffect(() => {
    setLocalAge(age);
  }, [age]);

  return h("div.settings", [
    h("p.info", "Display options for Macrostrat's map."),
    h(LabelsButton),
    h(ThemeButton),
    h(
      ExpandablePanel,
      {
        icon: "clean",
        isOpen: showExperiments,
        title: "Experiments",
        intent: "warning",
        setIsOpen() {
          runAction({ type: "toggle-experiments-panel" });
        },
      },
      [h(CompilationSelect), h(LineSymbolsControl), h(SourcesButton)]
    ),
    // ])
  ]);
};

function LineSymbolsControl() {
  const runAction = useAppActions();
  return h("div.control-wrapper", [
    h(
      Switch,
      {
        checked: useAppState((s) => s.mapLayers.has(MapLayer.LINE_SYMBOLS)),
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

function LabelsButton() {
  const layer = MapLayer.LABELS;
  const isShown = useAppState((state) => state.mapLayers.has(layer));
  const runAction = useAppActions();
  const [localAge, setLocalAge] = useState(null);
  const age = useAppState((s) => s.timeCursorAge);
  useEffect(() => {
    setLocalAge(age);
  }, [age]);

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
      checked: useAppState((s) => s.mapLayers.has(MapLayer.SOURCES)),
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
        checked: useAppState((s) => s.mapSettings.highResolutionTerrain),
        onChange() {
          dispatch({ type: "toggle-high-resolution-terrain" });
        },
      },
      "High-resolution terrain"
    )
  );
}

export { ExperimentsPanel, SettingsPanel };
