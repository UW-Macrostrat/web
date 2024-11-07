import {
  fetchIdsFromUnitId,
  IdsFromUnit,
  UnitsView,
} from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";
import { PostgrestError } from "@supabase/postgrest-js";
import { getSectionData } from "@macrostrat-web/column-builder/src/data-fetching";

export async function data(ctx: PageContext): Promise<UnitEditParams> {
  let { unit_id } = ctx.routeParams;

  if (Array.isArray(unit_id)) {
    unit_id = unit_id[0];
  } else if (typeof unit_id == "undefined") {
    unit_id = "0";
  }

  const query: IdsFromUnit = await fetchIdsFromUnitId(parseInt(unit_id));

  const { data: units, error: e } = await getSectionData({ id: unit_id }, 1);

  // This is kind of crazy but it seems to work OK
  const unit = Object.values(units[0])[0][0];

  const errors = e == null ? [] : [e];
  return { unit_id, unit, query, errors };
}

export interface UnitEditParams {
  unit_id: string;
  unit: UnitsView;
  query: IdsFromUnit;
  errors: PostgrestError[];
}
