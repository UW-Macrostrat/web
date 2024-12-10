import {
  ColumnGroupI,
  fetchIdsFromColGroup,
  IdsFromColGroup,
  tableSelect,
} from "@macrostrat-web/column-builder";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import { PageContext } from "vike/types";

export async function data(ctx: PageContext): Promise<EditColumnGroupData> {
  let { col_group_id } = ctx.routeParams;
  if (Array.isArray(col_group_id)) {
    col_group_id = col_group_id[0];
  }

  const query: IdsFromColGroup = await fetchIdsFromColGroup(
    parseInt(col_group_id ?? "0")
  );

  const { data, error }: PostgrestResponse<Partial<ColumnGroupI>> =
    await tableSelect("col_groups", {
      match: { id: col_group_id ?? "0" },
    });

  const columnGroup = data ? data[0] : {};
  const errors = [error].filter((e) => e != null);
  return { col_group_id, columnGroup, query, errors };
}

export interface EditColumnGroupData {
  errors: PostgrestError[];
  columnGroup: Partial<ColumnGroupI>;
  query: IdsFromColGroup;
}
