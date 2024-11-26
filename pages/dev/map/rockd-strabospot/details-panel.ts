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
import { useNearbyCheckins, useNearbySpots } from "./sidebar-data";

const h = hyper.styled(styles);

export function DetailsPanel({ position, nearbyFeatures, onClose }) {
  if (position == null) return null;
  return h(
    LocationPanel,
    {
      onClose,
      position,
    },
    [
      h(CheckinsPanel, { nearbyFeatures }),
      h(SpotsPanel, {
        nearbyFeatures,
      }),
    ]
  );
}

export function CheckinsPanel({ nearbyFeatures }) {
  const checkins = useNearbyCheckins(nearbyFeatures);

  return h(FeatureTypePanel, {
    features: checkins,
    title: "Rockd checkins",
  });
}

export function SpotsPanel({ nearbyFeatures }) {
  // Here, we handle loading state for feature
  const [features, loading, error] = useNearbySpots(nearbyFeatures);

  const title = "StraboSpot spots";

  return h(FeatureTypePanel, { features, title, loading, error });
}

function FeatureTypePanel({ features, title, loading = false, error = null }) {
  if (loading) return h(Spinner);
  if (error != null) {
    return h(NonIdealState, {
      title: "Error loading features",
      description: `${error}`,
      icon: "error",
    });
  }

  if (features.length == 0) {
    return h("div.empty-list", h("p", "No nearby " + title));
  }

  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        title,
        expanded: true,
      },
      h(Features, {
        features,
      })
    ),
  ]);
}

export function Features({ features }) {
  return h(
    "div.features",
    features.map((feature, i) => h(FeatureRecord, { key: i, feature }))
  );
}
