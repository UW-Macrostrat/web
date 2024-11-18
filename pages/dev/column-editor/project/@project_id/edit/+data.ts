import { Project, selectFirst } from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";
import { PostgrestError } from "@supabase/postgrest-js";

export async function data(ctx: PageContext): Promise<ProjectData> {
  const { project_id } = ctx.routeParams;

  const { firstData, error } = await selectFirst("projects", {
    match: { id: project_id },
  });
  const project = firstData ? firstData : {};
  const errors = [error].filter((e) => e != null);
  return { project_id, project, errors };
}

export interface ProjectData {
  project_id: string;
  project: Project;
  errors: PostgrestError[];
}
