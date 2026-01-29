import { fetchIdsFromColId, IdsFromCol } from "@macrostrat-web/column-builder";

import type { PageContext } from "vike/types";

export async function data(ctx: PageContext): Promise<NewUnitData> {
  let { col_id } = ctx.routeParams;

  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }
  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  return { col_id, query };
}

export interface NewUnitData {
  col_id: number;
  query: IdsFromCol;
}
