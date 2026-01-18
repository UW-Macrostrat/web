import { Project, tableSelect } from "@macrostrat-web/column-builder";
import { PostgrestError } from "@supabase/postgrest-js";
import type { PageContext } from "vike/types";

export async function data(ctx: PageContext): Promise<NewColumnGroupParams> {
  const { project_id } = ctx.routeParams;

  const { data, error } = await tableSelect("projects", {
    match: { id: project_id },
  });

  const project = data ? data[0] : {};
  const errors = [error].filter((e) => e != null);
  return { project_id, project, errors };
}

export interface NewColumnGroupParams {
  project_id: number;
  project: Project;
  errors: PostgrestError[];
}
