import { render } from "vike/abort";
import { fetchAllProjects, fetchAPIData, fetchAPIRefs } from "~/_utils";
import { findProject } from "~/components/project-filter/model";
import { getPrevalentTaxa } from "~/components/lex/data-helper.ts";

/** One column group: its definition, its columns, their fossils and
 * references. The project segment may be a slug or an id. */
export async function data(pageContext) {
  const key = String(pageContext.routeParams.project ?? "");
  const col_group_id = parseInt(pageContext.routeParams.group);
  if (Number.isNaN(col_group_id)) {
    throw render(404, "Column group ids are numbers.");
  }

  const [projects, resData, colData, fossilsData, refs1, refs2] =
    await Promise.all([
      fetchAllProjects(),
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

  const project = findProject(projects, key);
  if (project == null) {
    throw render(404, `Project "${key}" not found.`);
  }
  const group = resData?.[0] ?? null;
  if (group == null) {
    throw render(404, `Column group ${col_group_id} not found.`);
  }

  const refs = [...Object.values(refs1), ...Object.values(refs2)];
  const taxaData = await getPrevalentTaxa(fossilsData);

  return { project, resData: group, colData, taxaData, refs };
}
