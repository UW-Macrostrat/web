import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";

export async function data(pageContext) {
  const econ_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  if (isNaN(econ_id)) {
    throw new Error("Invalid economic ID in URL.");
  }

  // Generic error-handling wrapper
  const safeFetch = async (fn, label = "unnamed") => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`Fetch failed for ${label}:`, err);
      return null;
    }
  };

  // Fetch all data in parallel with error tolerance
  const [resData, colData, unitsData, fossilsData, refs1, refs2] =
    await Promise.all([
      safeFetch(() => fetchAPIData("/defs/econs", { econ_id }), "resData"),
      safeFetch(
        () =>
          fetchAPIData("/columns", {
            econ_id,
            response: "long",
            format: "geojson",
          }),
        "colData"
      ),
      safeFetch(() => fetchAPIData("/units", { econ_id }), "unitsData"),
      safeFetch(() => fetchAPIData("/fossils", { econ_id }), "fossilsData"),
      safeFetch(() => fetchAPIRefs("/fossils", { econ_id }), "refs1"),
      safeFetch(() => fetchAPIRefs("/columns", { econ_id }), "refs2"),
    ]);

  // Merge references safely
  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  // Build column ID list for PBDB taxa fetch
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
      console.warn("Error fetching PBDB taxa data:", err);
    }
  }

  return {
    resData: resData?.[0] ?? null,
    colData: colData ?? null,
    taxaData,
    refs,
    unitsData: unitsData ?? null,
    fossilsData: fossilsData ?? null,
  };
}
