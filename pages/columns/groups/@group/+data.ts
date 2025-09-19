import { pbdbDomain } from "@macrostrat-web/settings";
import { fetchAPIData, fetchAPIRefs } from "~/_utils";
import { getPrevalentTaxa } from "~/components/lex/data-helper";

export async function data(pageContext) {
  const col_group_id = parseInt(pageContext.urlParsed.pathname.split("/")[3]);

  // Await all API calls
  const [resData, colData, fossilsData, refs1, refs2] = await Promise.all([
    fetchAPIData("/defs/groups", { col_group_id }),
    fetchAPIData("/columns", {
      col_group_id,
      response: "long",
      format: "geojson",
    }),
    fetchAPIData("/fossils", { col_group_id, format: "geojson" }),
    fetchAPIRefs("/fossils", { col_group_id }),
    fetchAPIRefs("/columns", { col_group_id }),
  ]);

  const refValues1 = Object.values(refs1);
  const refValues2 = Object.values(refs2);
  const refs = [...refValues1, ...refValues2];

  const taxaData = await getPrevalentTaxa(fossilsData);

  return { resData: resData[0], colData, taxaData, refs };
}
