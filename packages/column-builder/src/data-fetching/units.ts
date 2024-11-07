import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import pg, {
  createUnitBySections,
  UnitsView,
} from "@macrostrat-web/column-builder/src";

type ReturnType = {
  data: { [section_id: number | string]: UnitsView[] }[];
  error: PostgrestError | null;
};

export async function getSectionData(
  match: any,
  limit: number | null = null
): Promise<ReturnType> {
  const { data: units, error }: PostgrestResponse<any> = await pg
    .from("units")
    .select(
      /// joins the lith_unit and environ_unit table
      "*, unit_strat_name_expanded(*,strat_names(*, strat_names_meta(*))),lith_unit(*),environ_unit(*)"
    )
    .order("position_bottom", { ascending: true })
    .match(match)
    .limit(limit ?? 100000);

  const u1 = units ?? [];

  const unitsMapped: UnitsView[] = u1.map((d) => {
    const { unit_strat_name_expanded = [], ...rest } = d;
    return { ...rest, strat_names: unit_strat_name_expanded };
  });

  return { data: createUnitBySections(unitsMapped), error };
}
