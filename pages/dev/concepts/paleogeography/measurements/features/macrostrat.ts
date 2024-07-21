/// https://paleobiodb.org/data1.2/colls/summary.json?show=time&min_ma=10&max_ma=12&level=3

import { useMemo } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import { clusterPoints, usePlateIntersection } from "./helpers";
import { useSelectedInterval } from "../time-intervals";

export function useMacrostratFeatures() {
  const interval = useSelectedInterval();
  /** Get features and assign to plates */
  const res = useAPIResult<{ records: any[] }>(
    "https://dev.macrostrat.org/api/v2/measurements",
    {
      format: "geojson",
      response: "light",
      interval_name: interval.nam
    }
  );

  const clustered = useMemo(() => {
    const data = res?.success?.data?.features;
    if (data == null) return null;
    return clusterPoints(data);
  }, [res]);

  return usePlateIntersection(clustered);
}
