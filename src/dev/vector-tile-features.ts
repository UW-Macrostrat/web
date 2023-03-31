import { Spinner, Switch } from "@blueprintjs/core";
import { useMapRef } from "@macrostrat/mapbox-react";
import mapboxgl from "mapbox-gl";
import { useEffect, useState, useRef } from "react";
import { useAppState } from "../map-interface/app-state";
import { group } from "d3-array";
import { ExpansionPanel } from "~/map-interface/components/expansion-panel";
import { h, FeatureRecord } from "./map-layers";

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
export function FeatureSelectionHandler({
  selectedLocation,
  setFeatures,
}: {
  selectedLocation: mapboxgl.LngLat;
  setFeatures: (features: mapboxgl.MapboxGeoJSONFeature[]) => void;
}) {
  const mapRef = useMapRef();
  const isLoading = useAppState((state) => state.core.mapIsLoading);
  const prevLocation = usePrevious(selectedLocation);

  useEffect(() => {
    const map = mapRef?.current;
    if (map == null) return;
    if (selectedLocation == null) {
      setFeatures(null);
      return;
    }

    if (isLoading && selectedLocation == prevLocation) return;

    const r = 2;
    const pt = map.project(selectedLocation);

    const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [pt.x - r, pt.y - r],
      [pt.x + r, pt.y + r],
    ];
    const features = map.queryRenderedFeatures(bbox);
    setFeatures(features);
  }, [mapRef?.current, selectedLocation, isLoading]);

  return null;
}

function FeatureHeader({ feature }) {
  return h("div.feature-header", [
    h("h3", [
      h(KeyValue, { label: "Source", value: feature.source }),
      h(KeyValue, { label: "Source layer", value: feature.sourceLayer }),
    ]),
  ]);
}

function KeyValue({ label, value }) {
  return h("span.key-value", [h("span.key", label), h("code.value", value)]);
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

export function TileInfo({ feature, showExtent, setShowExtent }) {
  if (feature == null) return null;
  const size = feature._vectorTileFeature._pbf.length;
  return h("div.tile-info", [
    h("h3", "Tile"),
    h("div.tile-index", [
      h(KeyValue, { label: "x", value: feature._x }),
      h(KeyValue, { label: "y", value: feature._y }),
      h(KeyValue, { label: "z", value: feature._z }),
    ]),
    h("div.spacer"),
    h(KeyValue, { label: "Size", value: formatSize(size) }),
    h(Switch, {
      label: "Show extent",
      alignIndicator: "right",
      checked: showExtent,
      onChange() {
        setShowExtent(!showExtent);
      },
    }),
  ]);
}

function formatSize(size: number) {
  if (size > 1000000)
    return h(UnitNumber, { value: size / 1000000, unit: "Mb" });
  if (size > 1000) return h(UnitNumber, { value: size / 1000, unit: "Kb" });
  return `${size} bytes`;
}

function UnitNumber({ value, unit, precision = 1 }) {
  return h("span.unit-number", [
    h("span.number", value.toFixed(precision)),
    h("span.unit", unit),
  ]);
}

export function FeaturePanel({ features }) {
  if (features == null) return null;
  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        title: "Macrostrat features",
        className: "macrostrat-features",
        expanded: true,
      },
      [
        h(LoadingAwareFeatureSet, {
          features,
          sourceID: "burwell",
        }),
      ]
    ),
    h(
      ExpansionPanel,
      { title: "Basemap features", className: "basemap-features" },
      [
        h(Features, {
          features: features.filter((d) => d.source != "burwell"),
        }),
      ]
    ),
  ]);
}

function Features({ features }) {
  /** Group features by source and sourceLayer */
  if (features == null) return null;

  const groups = group(features, (d) => `${d.source} - ${d.sourceLayer}`);

  return h(
    "div.features",
    Array.from(groups).map(([key, features]) => {
      return h("div.feature-group", [
        h(FeatureHeader, { feature: features[0] }),
        features.map((feature, i) => h(FeatureRecord, { key: i, feature })),
      ]);
    })
  );
}
