import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import { PageContext } from "vike/types";
import pg, {
  ColSectionI,
  fetchIdsFromColId,
  IdsFromCol,
  UnitsView,
} from "@macrostrat-web/column-builder";

import { getSectionData } from "@macrostrat-web/column-builder/src/data-fetching";

export async function data(ctx: PageContext) {
  let {
    routeParams: { col_id },
  } = ctx;
  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }

  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  const { data: colSections, error: e }: PostgrestResponse<ColSectionI> =
    await pg.from("col_section_data").select().match({ col_id });

  const {
    data: column,
    error: col_error,
  }: PostgrestResponse<{ col_name: string }> = await pg
    .from("cols")
    .select("col_name")
    .match({ id: col_id });

  const { data: sections, error: unit_error } = await getSectionData({
    col_id,
  });

  const errors = [e, col_error, unit_error].filter((e) => e != null);
  if (errors.length > 0) {
    console.error(errors);
  }
  return {
    col_id,
    colSections,
    column,
    errors,
    query,
    sections,
  };
}

export interface ColumnProps {
  col_id: string;
  colSections: ColSectionI[];
  column: { col_name: string }[];
  errors: PostgrestError[];
  query: IdsFromCol;
  sections: { [section_id: number | string]: UnitsView[] }[];
}
