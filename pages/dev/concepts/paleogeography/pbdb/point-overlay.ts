/// https://paleobiodb.org/data1.2/colls/summary.json?show=time&min_ma=10&max_ma=12&level=3

import { useMemo } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  useRotations,
  usePathGenerator,
  usePlatePolygons,
} from "@macrostrat/corelle";
import { geoContains } from "d3-geo";
import { scalePow } from "d3-scale";
import h from "@macrostrat/hyper";

function intersectFeatures(polygons, points) {
  let output = [];
  for (const pt of points) {
    for (const plate of polygons) {
      if (geoContains(plate, [pt.lng, pt.lat])) {
        const { old_lim, plate_id, young_lim } = plate.properties;
        output.push({
          ...pt,
          old_lim,
          plate_id,
          young_lim,
        });
        break;
      }
    }
  }
  return output;
}

function usePBDBFeatures(time: number, timeDelta: number = 2) {
  /** Get features and assign to plates */
  const res = useAPIResult<{ records: any[] }>(
    "https://paleobiodb.org/data1.2/colls/summary.json",
    {
      show: "time",
      min_ma: time - timeDelta,
      max_ma: time + timeDelta,
      level: 3,
    }
  );

  const polygons = usePlatePolygons();

  const platePoints = useMemo(() => {
    /** Memoized computation of polygon-point intersections */
    if (res == null || polygons == null) return [];
    return intersectFeatures(polygons, res.records);
  }, [res, polygons]);

  return platePoints;
}

const radiusScale = scalePow([0, 30], [1, 10])
  .exponent(0.5)
  .clamp(true);
const opacityScale = scalePow([0, 30], [0.8, 0.2])
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
  const pt = proj.pointRadius(radius)({
    coordinates: [lng, lat],
    type: "Point",
  });

  if (pt == null) return null;
  return h("path.pbdb-collection", {
    opacity: opacityScale(nco + noc),
    d: pt,
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
