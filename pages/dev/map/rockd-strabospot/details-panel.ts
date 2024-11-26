import { Spinner } from "@blueprintjs/core";
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
  const [features, loading, error] = useSidebarFeatures(nearbyFeatures);

  if (position == null) return null;
  return h(
    LocationPanel,
    {
      onClose,
      position,
    },
    h(FeaturePanel, {
      features,
      focusedSource: null,
      focusedSourceTitle: null,
    })
  );
}

function FeatureHeader({ feature }) {
  return h("div.feature-header", [h("h3", [h("code", feature.source)])]);
}

function LoadingAwareFeatureSet({ features, sourceID }) {
  const map = useMapRef();
  if (map?.current == null) return null;
  const [isLoaded, setIsLoaded] = useState(false);

  const sourceFeatures = features.filter((d) => d.source == "burwell");

  useEffect(() => {
    if (sourceFeatures.length > 0) {
      setIsLoaded(true);
      return;
    }

    const isLoaded = map.current.isSourceLoaded(sourceID);
    setIsLoaded(isLoaded);
    if (!isLoaded) {
      map.current.once("sourcedata", (e) => {
        if (e.sourceId == sourceID) {
          setIsLoaded(true);
        }
      });
    }
  }, [map.current, sourceID, sourceFeatures.length]);

  if (!isLoaded) return h(Spinner);
  return h(Features, { features: sourceFeatures });
}

export function FeaturePanel({ features, focusedSource = null }) {
  if (features == null) return null;

  let focusedSourcePanel = null;
  let filteredFeatures = features;
  let title = "Features";

  if (focusedSource != null) {
    title = "Basemap features";
    focusedSourcePanel = h(
      ExpansionPanel,
      {
        title: "Macrostrat features",
        className: "macrostrat-features",
        expanded: true,
      },
      h(LoadingAwareFeatureSet, {
        features,
        sourceID: focusedSource,
      })
    );
    filteredFeatures = features.filter((d) => d.source != focusedSource);
  }

  return h("div.feature-panel", [
    focusedSourcePanel,
    h(
      ExpansionPanel,
      { title, className: "basemap-features", expanded: focusedSource == null },
      h(FeatureGroups, {
        features: filteredFeatures,
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
