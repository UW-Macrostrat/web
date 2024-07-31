import pg, {
  ColumnGroupI,
  fetchIdsFromColGroup,
  IdsFromColGroup,
} from "@macrostrat-web/column-builder";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import { PageContext } from "vike/types";

export async function data(ctx: PageContext) {
  let { col_group_id } = ctx.routeParams;

  if (Array.isArray(col_group_id)) {
    col_group_id = col_group_id[0];
  }

  const query: IdsFromColGroup = await fetchIdsFromColGroup(
    parseInt(col_group_id ?? "0")
  );

  const { data, error }: PostgrestResponse<Partial<ColumnGroupI>> = await pg
    .from("col_groups")
    .select()
    .match({ id: col_group_id });

  const colGroup = data ? data[0] : {};

  const errors = error == null ? [] : [error];
  return { props: { col_group_id, colGroup, query, errors } };
}

export interface NewColumnData {
  col_group_id: string;
  colGroup: Partial<ColumnGroupI>;
  query: IdsFromColGroup;
  errors: PostgrestError[];
}
