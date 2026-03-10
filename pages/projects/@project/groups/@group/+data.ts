import { fetchAPIData, fetchAPIRefs, fetchProjectData } from "~/_utils";
import { getPrevalentTaxa } from "~/components/lex/data-helper.ts";

export async function data(pageContext) {
  console.log(pageContext.routeParams);
  const project_id = parseInt(pageContext.routeParams.project);
  const col_group_id = parseInt(pageContext.routeParams.group);

  // Await all API calls
  const [project, resData, colData, fossilsData, refs1, refs2] =
    await Promise.all([
      fetchProjectData(project_id),
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

  return { project, resData: resData[0], colData, taxaData, refs };
}
