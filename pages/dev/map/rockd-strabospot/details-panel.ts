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
import { getColors } from "#/dev/map/rockd-strabospot/map-style";
import { useInDarkMode } from "@macrostrat/ui-components";

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
      sourceLink: h(SystemLink, { href: "https://rockd.org" }, "Rockd"),
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
      sourceLink: h(
        SystemLink,
        { href: "https://strabospot.org" },
        "StraboSpot"
      ),
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

function PanelHeader({ title, sourceLink, hasData }) {
  return h("div.panel-header", [
    h("h2", title),
    h("span.details", [
      h.if(hasData && sourceLink != null)([sourceLink]),
      h.if(!hasData)("span.no-data", "None nearby"),
    ]),
  ]);
}

function SystemLink({ href, children }) {
  return h("span.system-link", [
    "via ",
    h("a.system-link", { href }, children),
  ]);
}

export function LegendList() {
  const darkMode = useInDarkMode();
  const colors = getColors(darkMode);
  return h("ul.legend-list", [
    h(
      LegendItem,
      {
        color: colors.checkins,
        name: "Checkins",
        sourceLink: h(SystemLink, { href: "https://rockd.org" }, "Rockd"),
      },
      "Outcrops collected as part of a community-collaborative field guide."
    ),
    h(
      LegendItem,
      {
        color: colors.spots,
        name: "Spots",
        sourceLink: h(
          SystemLink,
          { href: "https://strabospot.org" },
          "StraboSpot"
        ),
      },
      "Sites collected for research purposes (filtered for general interest)."
    ),
  ]);
}

function LegendItem({ color, name, sourceLink, children }) {
  let child = children;
  if (typeof children === "string") {
    child = h("p.description", children);
  }

  return h("li.legend-item", [
    h(LegendHeader, { color, name, sourceLink }),
    h("div.legend-body", child),
  ]);
}

function LegendHeader({ color, name, sourceLink = null }) {
  return h("div.legend-header", [
    h(Swatch, { color }),
    h("h4", name),
    sourceLink,
  ]);
}

function Swatch({ color }) {
  return h("span.swatch", { style: { backgroundColor: color } });
}
