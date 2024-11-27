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

  const titleComponent = () =>
    h(PanelHeader, {
      title: "Checkins",
      link: "rockd.org",
      linkText: "Rockd",
      hasData: checkins.length != 0,
    });

  return h(FeatureTypePanel, {
    features: checkins,
    titleComponent,
    featureComponent: CheckinFeature,
  });
}

export function SpotsPanel({ nearbyFeatures }) {
  // Here, we handle loading state for feature
  const [features, loading, error] = useNearbySpots(nearbyFeatures);

  const titleComponent = () =>
    h(PanelHeader, {
      title: "Featured spots",
      link: "https://strabospot.org",
      linkText: "StraboSpot",
      hasData: features.length != 0,
    });

  return h(FeatureTypePanel, {
    features,
    titleComponent,
    loading,
    error,
    featureComponent: StraboSpotFeature,
  });
}

const StraboSpotFeature = (props) => h(SpotListing, { spot: props.data });
const CheckinFeature = (props) => h(CheckinListing, { checkin: props.data });

function FeatureTypePanel({
  features,
  titleComponent,
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

  // if (features.length == 0) {
  //   return h("div.empty-list", h("p", "No nearby " + title));
  // }

  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        titleComponent,
        title: null,
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

function PanelHeader({ title, link, linkText, hasData }) {
  return h("div.panel-header", [
    h("h2", title),
    h("span.details", [
      h.if(hasData)("span.system-link", [
        "via ",
        h("a", { href: link }, linkText),
      ]),
      h.if(!hasData)("span.no-data", "None nearby"),
    ]),
  ]);
}
