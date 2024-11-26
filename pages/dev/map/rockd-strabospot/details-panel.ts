import { NonIdealState, Spinner } from "@blueprintjs/core";
import { useMapRef } from "@macrostrat/mapbox-react";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useEffect, useState } from "react";
import { group } from "d3-array";
import {
  ExpansionPanel,
  FeatureRecord,
  LocationPanel,
} from "@macrostrat/map-interface";
import { useSidebarFeatures } from "./sidebar-data";

const h = hyper.styled(styles);

export function DetailsPanel({ position, nearbyFeatures, onClose }) {
  if (position == null) return null;
  return h(
    LocationPanel,
    {
      onClose,
      position,
    },
    h(SpotsPanel, {
      nearbyFeatures,
    })
  );
}

function FeatureHeader({ feature }) {
  return h("div.feature-header", [h("h3", [h("code", feature.source)])]);
}

export function SpotsPanel({ nearbyFeatures }) {
  // Here, we handle loading state for feature
  const [features, loading, error] = useSidebarFeatures(nearbyFeatures);
  if (loading) return h(Spinner);
  if (error != null) {
    return h(NonIdealState, {
      title: "Error loading features",
      description: `${error}`,
      icon: "error",
    });
  }

  let title = "Features";

  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      { title, className: "basemap-features", expanded: true },
      h(FeatureGroups, {
        features,
      })
    ),
  ]);
}

function FeatureGroups({ features }) {
  /** Group features by source and sourceLayer */
  if (features == null) return null;

  const groups = group(features, (d) => `${d.source} - ${d.sourceLayer}`);

  return h(
    "div.feature-groups",
    Array.from(groups).map(([key, features]) => {
      return h("div.feature-group", [
        h(FeatureHeader, { feature: features[0] }),
        h(Features, { features }),
      ]);
    })
  );
}

export function Features({ features }) {
  return h(
    "div.features",
    features.map((feature, i) => h(FeatureRecord, { key: i, feature }))
  );
}
