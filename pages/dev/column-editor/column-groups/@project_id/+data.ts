import pg, { ColumnGroupI } from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";
import { PostgrestError } from "@supabase/postgrest-js";

export async function data(ctx: PageContext): Promise<ColumnGroupsData> {
  const { project_id } = ctx.routeParams;

  const { data, error } = await pg
    .from("col_group_with_cols")
    .select("*")
    .match({ project_id });

  const projectName: string = data && data.length > 0 ? data[0].project : "";
  const errors = [error].filter((e) => e != null);

  return { project_id, projectName, columnGroups: data, errors };
}

export interface ColumnGroupsData {
  projectName: string;
  project_id: number;
  columnGroups: ColumnGroupI[];
  errors: PostgrestError[];
}
