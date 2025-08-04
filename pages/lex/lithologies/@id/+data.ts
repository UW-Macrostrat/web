import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const lith_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  if (isNaN(lith_id)) {
    throw new Error("Invalid lithology ID in URL.");
  }

  // Helper to safely fetch data and catch errors
  const safeFetch = async (fn, label = "unnamed") => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Fetch failed for ${label}:`, err);
      return null;
    }
  };

  // Perform all API calls concurrently, with error handling
  const [resData, colData, mapsData, fossilsData, refs1, refs2] =
    await Promise.all([
      safeFetch(() => fetchAPIData("/defs/lithologies", { lith_id }), "resData"),
      safeFetch(
        () =>
          fetchAPIData("/columns", {
            lith_id,
            response: "long",
            format: "geojson",
          }),
        "colData"
      ),
      safeFetch(() => fetchAPIData("/geologic_units/map/legend", { lith_id }), "mapsData"),
      safeFetch(() => fetchAPIData("/fossils", { lith_id }), "fossilsData"),
      safeFetch(() => fetchAPIRefs("/fossils", { lith_id }), "refs1"),
      safeFetch(() => fetchAPIRefs("/columns", { lith_id }), "refs2"),
    ]);

  // Combine and flatten references safely
  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  // Extract column IDs to fetch taxa data (PBDB)
  const cols = colData?.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

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
      console.warn("Error fetching taxa data from PBDB:", err);
    }
  }

  return {
    resData: resData?.[0] ?? null,
    colData: colData ?? null,
    taxaData,
    refs,
    fossilsData: fossilsData ?? null,
    mapsData: mapsData ?? null,
  };
}
