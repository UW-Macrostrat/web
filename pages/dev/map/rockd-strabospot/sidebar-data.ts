/* Skeletal  function to process data for sidebar.
Async so that we can add data fetching from server.
*/
import { useAsyncEffect } from "@macrostrat/ui-components";
import { useState } from "react";

export function useSidebarFeatures(nearbyFeatures) {
  return useLoadableValue(
    () => processSidebarData(nearbyFeatures),
    [nearbyFeatures]
  );
}

async function processSidebarData(data) {
  return data;
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
  }, [func, ...deps]);

  return [result, result == null && error == null, error];
}
