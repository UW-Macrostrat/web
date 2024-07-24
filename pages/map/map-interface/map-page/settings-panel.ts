// Settings panel for the map

// TODO: re-integrate LinkButton to @macrostrat/router-components
import {
  AnchorButton,
  Button,
  ButtonGroup,
  Callout,
  Collapse,
  Icon,
  IconName,
  Intent,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { applyMapPositionToHash } from "@macrostrat/map-interface";
import {
  DarkModeButton,
  buildQueryString,
  darkModeUpdater,
  useDarkMode,
} from "@macrostrat/ui-components";
import { useEffect, useState } from "react";
import {
  MapLayer,
  useAppActions,
  useAppState,
} from "#/map/map-interface/app-state";

import h from "./settings-panel.module.styl";

const ExperimentsPanel = (props) => {
  const dispatch = useAppActions();
  //const { pathname } = useLocation();
  //const globeActive = pathname?.startsWith("/globe");
  return h("div.settings.experiments.bp5-text.text-panel", [
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
  ]);
};

const SettingsPanel = (props) => {
  const runAction = useAppActions();
  const showExperiments = useAppState((s) => s.core.showExperimentsPanel);
  const age = useAppState((s) => s.core.timeCursorAge);
  const [localAge, setLocalAge] = useState(age);

  useEffect(() => {
    setLocalAge(age);
  }, [age]);

  return h("div.settings", [
    h("p.info", "Display options for Macrostrat's map."),
    h(LabelsButton),
    h(ThemeButton),
    h(
      CalloutPanel,
      {
        icon: "clean",
        isOpen: showExperiments,
        title: "Experiments",
        intent: "warning",
        setIsOpen() {
          runAction({ type: "toggle-experiments-panel" });
        },
      },
      [
        h(LineSymbolsControl),
        h(SourcesButton),
        h(PaleogeographyButton),
        h(GlobeLink),
      ]
    ),
    // ])
  ]);
};

function GlobeLink() {
  const mapPosition = useAppState((s) => s.core.mapPosition);
  let args = {};
  applyMapPositionToHash(args, mapPosition);

  return h(AnchorButton, {
    href:
      "/dev/globe#" +
      buildQueryString(args, { arrayFormat: "comma", sort: false }),
    minimal: true,
    intent: "warning",
    icon: "globe-network",
    text: "Switch to globe",
  });
}

function PaleogeographyButton() {
  const runAction = useAppActions();
  const age = useAppState((s) => s.core.timeCursorAge);
  return h(
    Button,
    {
      onClick() {
        runAction({ type: "set-time-cursor", age: age != null ? null : 0 });
      },
      icon: "time",
      intent: "warning",
      minimal: true,
      active: age != null,
    },
    "Paleogeography"
  );
}

function CalloutPanel({
  isOpen,
  setIsOpen,
  children,
  icon,
  intent = Intent.PRIMARY,
  title,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  children: any;
  icon: IconName;
  intent?: Intent;
  title: string;
}) {
  return h("div.callout-panel", { className: isOpen ? "expanded" : null }, [
    h("div.callout-header", [
      h(
        Button,
        {
          minimal: true,
          icon,
          active: isOpen,
          intent: "warning",
          onClick() {
            setIsOpen(!isOpen);
          },
        },
        title
      ),
    ]),
    h(
      Collapse,
      {
        isOpen: isOpen,
        className: "callout-content",
      },
      h(Callout, { intent, icon: null }, [children])
    ),
  ]);
}

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

  const darkModeText = darkMode.isEnabled
    ? "Turn on the lights"
    : "Turn off the lights";
  return h("div.dark-mode-controls", [
    h(DarkModeButton, { minimal: true, active: false, allowReset: true }, [
      h("span.text", darkModeText),
    ]),
    h(
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
    ),
  ]);
}

function LabelsButton() {
  const layer = MapLayer.LABELS;
  const isShown = useAppState((state) => state.core.mapLayers.has(layer));
  const runAction = useAppActions();
  const [localAge, setLocalAge] = useState(null);
  const age = useAppState((s) => s.core.timeCursorAge);
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
