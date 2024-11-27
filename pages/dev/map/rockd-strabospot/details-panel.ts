import { NonIdealState, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import {
  ExpansionPanel,
  FeatureProperties,
  LocationPanel,
} from "@macrostrat/map-interface";
import { useNearbyCheckins, useNearbySpots } from "./sidebar-data";
import { CheckinListing, SpotListing } from "@macrostrat/data-components";

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
    featureComponent: CheckinFeature,
  });
}

export function SpotsPanel({ nearbyFeatures }) {
  // Here, we handle loading state for feature
  const [features, loading, error] = useNearbySpots(nearbyFeatures);

  const title = "StraboSpot spots";

  return h(FeatureTypePanel, {
    features,
    title,
    loading,
    error,
    featureComponent: StraboSpotFeature,
  });
}

const StraboSpotFeature = (props) => h(SpotListing, { spot: props.data });
const CheckinFeature = (props) => h(CheckinListing, { checkin: props.data });

function FeatureTypePanel({
  features,
  title,
  loading = false,
  error = null,
  featureComponent,
}) {
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

  console.log(features);

  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        title,
        expanded: true,
      },
      h(Features, {
        features,
        featureComponent,
      })
    ),
  ]);
}

export function Features({ features, featureComponent = FeatureProperties }) {
  return h(
    "div.features",
    features.map((feature, i) => h(featureComponent, { key: i, data: feature }))
  );
}
