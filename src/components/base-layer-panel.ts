import hyper from "@macrostrat/hyper";
import { Switch } from "@blueprintjs/core";
import { DarkModeButton } from "@macrostrat/ui-components";
import { useState } from "react";
import { BaseLayerSelector, Basemap } from "./map-controls";
import { ExpandablePanel } from "./expandable-panel";
import styles from "./base-layer-panel.module.scss";

const h = hyper.styled(styles);

/** Disclosure bundling the base-layer selector, a map-labels toggle, and the
 * dark-mode button. Rendered as a light-grey `ExpandablePanel` (the same shape
 * as the map "Experiments" panel, default intent).
 *
 * Presentational: callers own the basemap and label-visibility state (typically
 * URL-synced atoms) and pass it in, so the panel renders identically wherever
 * it's used. `options` restricts the offered basemaps (default: Satellite +
 * Basic, since "None" is a no-op on globe views). */
export function BaseLayerForm({
  basemap,
  setBasemap,
  showLabels,
  setShowLabels,
  options = [Basemap.Satellite, Basemap.Basic],
}) {
  const [isOpen, setOpen] = useState(false);

  return h(
    ExpandablePanel,
    { isOpen, setIsOpen: setOpen, title: "Base layer", icon: "layers" },
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
  );
}
