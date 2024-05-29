import { geoContains } from "d3-geo";
import Supercluster from "supercluster";
import { useMemo } from "react";
import { usePlatePolygons } from "@macrostrat/corelle";

export function intersectFeatures(polygons, points) {
  let output = [];
  for (const pt of points) {
    for (const plate of polygons) {
      if (geoContains(plate, pt.geometry.coordinates)) {
        const { old_lim, plate_id, young_lim } = plate.properties;
        output.push({
          ...pt,
          old_lim,
          plate_id,
          young_lim
        });
        break;
      }
    }
  }
  return output;
}

export function clusterPoints(data, zoomLevel = 4, opts = {}) {
  const cluster = new Supercluster({
    radius: 20,
    ...opts
  });
  cluster.load(data);
  return cluster.getClusters([-180, -90, 180, 90], zoomLevel);
}

/// https://paleobiodb.org/data1.2/colls/summary.json?show=time&min_ma=10&max_ma=12&level=3

export function usePlateIntersection(features: any[]) {
  const polygons = usePlatePolygons();
  return useMemo(() => {
    /** Memoized computation of polygon-point intersections */
    if (features == null || polygons == null) return [];
    const res = intersectFeatures(polygons, features);
    return res;
  }, [features, polygons]);
}
