import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const environ_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  if (isNaN(environ_id)) {
    throw new Error("Invalid environment ID in URL.");
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
      safeFetch(() => fetchAPIData("/defs/environments", { environ_id }), "resData"),
      safeFetch(
        () =>
          fetchAPIData("/columns", {
            environ_id,
            response: "long",
            format: "geojson",
          }),
        "colData"
      ),
      safeFetch(() => fetchAPIData("/fossils", { environ_id }), "fossilsData"),
      safeFetch(() => fetchAPIRefs("/fossils", { environ_id }), "refs1"),
      safeFetch(() => fetchAPIRefs("/columns", { environ_id }), "refs2"),
    ]);

  // Merge references safely
  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  // Extract column IDs for PBDB fossil data
  const cols = colData?.features
    ?.map((feature) => feature.properties.col_id)
    ?.join(",");

  // Fetch PBDB fossil prevalence data
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
