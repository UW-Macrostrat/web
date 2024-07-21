/// https://paleobiodb.org/data1.2/colls/summary.json?show=time&min_ma=10&max_ma=12&level=3
import { useRotations, usePathGenerator } from "@macrostrat/corelle";
import { FeatureLayer } from "@macrostrat/map-components";
import { useSGPData } from "./features/sgp";
import { scalePow } from "d3-scale";
import {
  usePBDBFeatures,
  useMacrostratFeatures,
  useSGPFeatures
} from "./features";
import h from "@macrostrat/hyper";

const radiusScale = scalePow([0, 30], [1, 10])
  .exponent(0.5)
  .clamp(true);
const opacityScale = scalePow([0, 30], [0.5, 0.2])
  .exponent(0.5)
  .clamp(true);

function PBDBPoint({ feature }) {
  /** Render a single PBDB point */
  const proj = usePathGenerator(feature.plate_id);
  const { time } = useRotations();
  if (proj == null) return null;
  if (time < feature.young_lim || time > feature.old_lim) return null;

  const { noc, nco, lng, lat } = feature;
  const radius = radiusScale(nco + noc);
  const pt = proj.pointRadius(radius)(feature.geometry);

  if (pt == null) return null;
  return h("path", {
    opacity: opacityScale(nco + noc),
    d: pt
  });
}

export function PBDBCollectionLayer() {
  const { time } = useRotations();
  const features = usePBDBFeatures(time);

  return h(
    "g.pbdb-collections",
    {},
    features.map((d, i) => {
      return h(PBDBPoint, { feature: d });
    })
  );
}

const defaultStyle = {
  fill: "transparent",
  stroke: "purple"
};

function BasicPoint({ feature }) {
  /** Render a single PBDB point */
  const proj = usePathGenerator(feature.plate_id);
  const { time } = useRotations();
  if (proj == null) return null;
  if (time < feature.young_lim || time > feature.old_lim) return null;

  const pointCount = feature?.properties?.point_count ?? 1;
  const radius = radiusScale(pointCount);
  const pt = proj.pointRadius(radius)(feature.geometry);

  if (pt == null) return null;
  return h("path", {
    opacity: opacityScale(pointCount),
    d: pt
  });
}

export function SGPSamplesLayer() {
  const { time } = useRotations();
  const features = useSGPFeatures(time);
  if (features == null) return null;
  console.log(features);
  return h(
    "g.sgp-collections",
    {},
    features.map((d, i) => {
      return h(BasicPoint, { feature: d });
    })
  );
}

export function MacrostratMeasurementsLayer() {
  const features = useMacrostratFeatures();
  if (features == null) return null;
  console.log(features);
  return h(
    "g.macrostrat-collections",
    {},
    features.map((d, i) => {
      return h(BasicPoint, { feature: d });
    })
  );
}
