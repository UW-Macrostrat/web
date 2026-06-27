import hyper from "@macrostrat/hyper";
import { Button, Collapse, Switch } from "@blueprintjs/core";
import { DarkModeButton } from "@macrostrat/ui-components";
import { useState } from "react";
import { BaseLayerSelector, Basemap } from "./map-controls";
import styles from "./base-layer-panel.module.scss";

const h = hyper.styled(styles);

/** Slim, low-key disclosure bundling the base-layer selector, a map-labels
 * toggle, and the dark-mode button — quiet until opened.
 *
 * Presentational: callers own the basemap and label-visibility state (typically
 * URL-synced atoms) and pass it in, so the panel renders identically wherever
 * it's used. `options` restricts the offered basemaps (default: Satellite +
 * Basic, since "None" is a no-op on globe views). */
export function BaseLayerDisclosure({
  basemap,
  setBasemap,
  showLabels,
  setShowLabels,
  options = [Basemap.Satellite, Basemap.Basic],
}) {
  const [isOpen, setOpen] = useState(false);

  let chevron = "chevron-down";
  if (isOpen) chevron = "chevron-up";

  return h("div.base-layer-disclosure", [
    h(Button, {
      className: "base-layer-toggle",
      text: "Base layer",
      minimal: true,
      small: true,
      fill: true,
      alignText: "left",
      rightIcon: chevron,
      onClick: () => setOpen(!isOpen),
    }),
    h(
      Collapse,
      { isOpen },
      h("div.base-layer-content", [
        h(BaseLayerSelector, {
          layer: basemap,
          setLayer: setBasemap,
          showTitle: false,
          options,
        }),
        h(Switch, {
          label: "Map labels",
          checked: showLabels,
          onChange: (e) => setShowLabels(e.currentTarget.checked),
        }),
        h(DarkModeButton, { showText: true, minimal: true, small: true }),
      ])
    ),
  ]);
}
