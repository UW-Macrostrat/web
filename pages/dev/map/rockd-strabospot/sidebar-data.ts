/* Skeletal  function to process data for sidebar.
Async so that we can add data fetching from server.
*/
import { useAsyncEffect } from "@macrostrat/ui-components";
import { useState } from "react";
import { PostgrestClient } from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";

const pg = new PostgrestClient(postgrestPrefix);

export function useNearbyCheckins(nearbyFeatures) {
  if (nearbyFeatures == null) {
    return [];
  }
  return nearbyFeatures.filter((d) => d.source === "rockdCheckins").slice(0, 5);
}

export function useNearbySpots(nearbyFeatures) {
  console.log("Rendering sidebar features");

  return useLoadableValue(
    () => processSpotsData(nearbyFeatures),
    [nearbyFeatures]
  );
}

async function processSpotsData(data) {
  const restrictedData = data
    .filter((d) => d.source === "notableSpots")
    .slice(0, 5);

  const ids = restrictedData.map((d) => d.properties.id);

  const features = await pg.from("datasets").select("*").in("id", ids);

  return restrictedData;
}

function useLoadableValue(func, deps): [any, boolean, any] {
  /** This should be moved to UI components */
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useAsyncEffect(async () => {
    try {
      setError(null);
      const result = await func();
      setResult(result);
    } catch (err) {
      setError(err);
    }
  }, deps);

  return [result, result == null && error == null, error];
}
