import {
  fetchIdsFromUnitId,
  IdsFromUnit,
  selectFirst,
  StratNameI,
} from "@macrostrat-web/column-builder";
import { PostgrestError } from "@supabase/postgrest-js";
import type { PageContext } from "vike/types";

export async function data(
  ctx: PageContext
): Promise<EditStratigraphicNameData> {
  let { strat_name_id, unit_id } = ctx.routeParams;

  if (Array.isArray(unit_id)) {
    unit_id = unit_id[0];
  } else if (typeof unit_id == "undefined") {
    unit_id = "0";
  }
  const query: IdsFromUnit = await fetchIdsFromUnitId(parseInt(unit_id));

  const { firstData: strat_name, error } = await selectFirst(
    "strat_names_ref",
    {
      match: { id: strat_name_id },
    }
  );
  const errors = error == null ? [] : [error];
  return { strat_name_id, strat_name, errors, unit_id, query };
}

export interface EditStratigraphicNameData {
  strat_name_id: number;
  strat_name: StratNameI;
  unit_id: number;
  query: IdsFromUnit;
  errors: PostgrestError[];
}
