import { JSONView } from "@macrostrat/ui-components";
import { Button } from "@blueprintjs/core";
import styles from "./details-panel.module.sass";
import hyper from "@macrostrat/hyper";

const h = hyper.styled(styles);

export function MapSelectedFeatures({
  features,
  onClose,
  selectFeatures,
  className,
}) {
  if (features == null || features.length === 0) {
    return null;
  }
  return h("div.map-selected-features", { className }, [
    h("div.toolbar", [
      h("h3", "Selected features"),
      h(Button, {
        icon: "cross",
        minimal: true,
        onClick: onClose,
      }),
    ]),
    h("div.feature-list", [
      features.map((f) => {
        return h(Feature, { feature: f });
      }),
    ]),
  ]);
}

function Feature({ feature }) {
  return h("div.feature", [
    h(JSONView, {
      data: feature._vectorTileFeature.properties,
      showRoot: false,
    }),
  ]);
}
