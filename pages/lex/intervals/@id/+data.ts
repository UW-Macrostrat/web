import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const int_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  if (isNaN(int_id)) {
    throw new Error("Invalid interval ID in URL.");
  }

  // Helper for safe API calls
  const safeFetch = async (fn, label = "unnamed") => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Fetch failed for ${label}:`, err);
      return null;
    }
  };

  // Fetch all API data concurrently, with individual error handling
  const [resData, colData, fossilsData, refs1, refs2] =
    await Promise.all([
      safeFetch(() => fetchAPIData("/defs/intervals", { int_id }), "resData"),
      safeFetch(
        () =>
          fetchAPIData("/columns", {
            int_id,
            response: "long",
            format: "geojson",
          }),
        "colData"
      ),
      safeFetch(() => fetchAPIData("/fossils", { int_id }), "fossilsData"),
      safeFetch(() => fetchAPIRefs("/fossils", { int_id }), "refs1"),
      safeFetch(() => fetchAPIRefs("/columns", { int_id }), "refs2"),
    ]);

  // Merge references, safely
  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  // Extract column IDs
  const cols = colData?.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  // Optional: Fetch PBDB taxa data
  let taxaData = null;
  if (cols) {
    try {
      const response = await fetch(
        `${pbdbDomain}/data1.2/occs/prevalence.json?limit=5&coll_id=${cols}`
      );
      if (response.ok) {
        taxaData = await response.json();
      } else {
        console.warn("PBDB taxa fetch failed with status", response.status);
      }
    } catch (err) {
      console.warn("Error fetching PBDB taxa data:", err);
    }
  }

  return {
    resData: resData?.[0] ?? null,
    colData: colData ?? null,
    taxaData,
    refs,
    fossilsData: fossilsData ?? null,
  };
}
