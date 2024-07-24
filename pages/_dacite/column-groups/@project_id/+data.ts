import pg from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";

export async function data(ctx: PageContext) {
  const { project_id } = ctx.routeParams;

  const { data, error } = await pg
    .from("col_group_with_cols")
    .select("*, projects(project)")
    .match({ project_id });

  const projectName: string =
    data && data.length > 0 ? data[0].projects.project : "";
  const errors = [error].filter((e) => e != null);

  return { project_id, projectName, columnGroups: data, errors };
}
