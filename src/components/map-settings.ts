/**
 * Shared display settings for the small "inset" maps embedded in content pages
 * (the `/columns` and `/lex` column maps), and the settings bar rendered
 * directly beneath them.
 *
 * Both subtrees mount their map once, in a layout, and move it between pages
 * (see `~/components/column-map/target` and `~/components/lex/map-target`), so
 * the map and the page-side controls live in different React trees — and, on
 * `/columns`, on opposite sides of a jotai `Provider`. Settings therefore live
 * in an explicit store that both halves name, like `columnMapStore`.
 *
 * The basemap is a viewer preference rather than view state, so it is remembered
 * in localStorage instead of the URL.
 *
 * Server-safe: no mapbox import.
 */
import hyper from "@macrostrat/hyper";
import { Button, PopoverNext, Switch } from "@blueprintjs/core";
import { useInDarkMode } from "@macrostrat/ui-components";
import { createStore, useAtom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { ReactNode, useMemo } from "react";

import { BaseLayerSelector, Basemap, basemapStyle } from "./map-controls";
import styles from "./map-settings.module.sass";

const h = hyper.styled(styles);

export interface InsetMapSettings {
  basemap: Basemap.Basic | Basemap.Satellite;
  showLabels: boolean;
}

const defaultInsetMapSettings: InsetMapSettings = {
  basemap: Basemap.Basic,
  showLabels: false,
};

/** The one store the inset maps and their settings bars share. */
export const mapSettingsStore = createStore();

export const insetMapSettingsAtom = atomWithStorage<InsetMapSettings>(
  "macrostrat:inset-map-settings",
  defaultInsetMapSettings
);

export function useInsetMapSettings() {
  return useAtom(insetMapSettingsAtom, { store: mapSettingsStore });
}

/** Props for an `InsetMap`/`ColumnNavigationMap` that follow the shared
 * settings. */
export function useInsetMapStyleProps() {
  const settings = useAtomValue(insetMapSettingsAtom, {
    store: mapSettingsStore,
  });
  const inDarkMode = useInDarkMode();
  const { basemap, showLabels } = settings ?? defaultInsetMapSettings;

  return useMemo(() => {
    // Default-colored footprints wash out against imagery.
    let columnColor = undefined;
    if (basemap == Basemap.Satellite) columnColor = "#000";
    return {
      mapStyle: basemapStyle(basemap, inDarkMode),
      showLabels,
      columnColor,
    };
  }, [basemap, showLabels, inDarkMode]);
}

/** The basemap and labels controls, plus any map-specific layer toggles passed
 * as children and any further `sections`, behind a small settings button.
 * `iconOnly` drops the label, for a button floating over the map. */
export function MapSettingsButton({
  children,
  sections,
  iconOnly = false,
}: {
  children?: ReactNode;
  sections?: ReactNode;
  iconOnly?: boolean;
}) {
  const [settings, setSettings] = useInsetMapSettings();
  const { basemap, showLabels } = settings ?? defaultInsetMapSettings;

  const update = (patch: Partial<InsetMapSettings>) =>
    setSettings({ ...defaultInsetMapSettings, ...settings, ...patch });

  let layerSection = null;
  if (children != null) {
    layerSection = h("div.settings-section", [h("h4", "Layers"), children]);
  }

  const content = h("div.map-settings-content", [
    h("div.settings-section", [
      h("h4", "Base layer"),
      h(BaseLayerSelector, {
        layer: basemap,
        setLayer: (value) => update({ basemap: value }),
        showTitle: false,
        options: [Basemap.Basic, Basemap.Satellite],
      }),
      h(Switch, {
        label: "Map labels",
        checked: showLabels,
        onChange: (e) => update({ showLabels: e.currentTarget.checked }),
      }),
    ]),
    layerSection,
    sections,
  ]);

  let text = "Map settings";
  if (iconOnly) {
    text = undefined;
  }

  return h(PopoverNext, {
    content,
    placement: "bottom-start",
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(Button, {
        ...targetProps,
        active: isOpen,
        icon: "cog",
        text,
        title: "Map settings",
        minimal: true,
        small: true,
        className: "map-settings-button",
      }),
  });
}

/** The bar directly beneath an inset map: the settings button on the left, and
 * page-specific content (hints, links) on the right. */
export function MapSettingsBar({
  settings,
  children,
  className,
}: {
  /** Extra layer toggles for the settings popover */
  settings?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return h("div.map-settings-bar", { className }, [
    h(MapSettingsButton, null, settings),
    h("div.map-settings-bar-extra", children),
  ]);
}

/** A titled block in the settings popover, for page-specific controls. */
export function MapSettingsSection({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return h("div.settings-section", [h("h4", title), children]);
}

/** The settings button, floating over an inset map's top edge rather than
 * taking a strip beneath it. */
export function MapSettingsOverlay({
  settings,
  sections,
}: {
  settings?: ReactNode;
  sections?: ReactNode;
}) {
  return h(
    "div.map-settings-overlay",
    h(MapSettingsButton, { sections, iconOnly: true }, settings)
  );
}
