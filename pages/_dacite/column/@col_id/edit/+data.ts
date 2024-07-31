import pg, {
  ColumnForm,
  fetchIdsFromColId,
  IdsFromCol,
  selectFirst,
} from "@macrostrat-web/column-builder";
import { PostgrestResponse } from "@supabase/postgrest-js";
import { PageContext } from "vike/types";

export async function data(ctx: PageContext) {
  let { col_id } = ctx.routeParams;
  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }
  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  const { data, error }: PostgrestResponse<ColumnForm> = await pg
    .from("cols")
    .select("*,refs(*)")
    .match({ id: parseInt(col_id ?? "0") });

  const { firstData, error: error_ } = await selectFirst("cols", {
    columns: "col_groups!cols_col_group_id_fkey(*)",
    match: { id: parseInt(col_id ?? "0") },
    limit: 1,
  });

  const errors = [error, error_].filter((e) => e != null);

  console.log(data);

  return {
    col_id,
    column: data,
    curColGroup: firstData.col_groups,
    query,
    errors,
  };
}
