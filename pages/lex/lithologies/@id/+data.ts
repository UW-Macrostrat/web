import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";
import { getPrevalentTaxa } from "~/components/lex/data-helper";

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
  const [resData, colData, mapsData, fossilsData, refs1, refs2, unitsData] =
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
      safeFetch(() => fetchAPIData("/fossils", { lith_id, format: "geojson" }), "fossilsData"),
      safeFetch(() => fetchAPIRefs("/fossils", { lith_id }), "refs1"),
      safeFetch(() => fetchAPIRefs("/columns", { lith_id }), "refs2"),
      safeFetch(() => fetchAPIData("/units", { lith_id }), "unitsData"),
    ]);

  // Combine and flatten references safely
  const refValues1 = refs1 ? Object.values(refs1) : [];
  const refValues2 = refs2 ? Object.values(refs2) : [];
  const refs = [...refValues1, ...refValues2];

  const taxaData = await getPrevalentTaxa(fossilsData);

  return {
    resData: resData?.[0] ?? null,
    colData: colData ?? null,
    taxaData,
    refs,
    fossilsData: fossilsData ?? null,
    mapsData: mapsData ?? null,
    unitsData: unitsData ?? null,
  };
}
