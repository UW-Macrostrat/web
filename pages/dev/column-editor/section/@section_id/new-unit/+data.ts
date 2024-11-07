import {
  IdsFromSection,
  fetchIdsFromSectionId,
  selectFirst,
} from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";
import { PostgrestError } from "@supabase/postgrest-js";

export interface NewUnitData {
  col_id: number;
  section_id: string;
  query: IdsFromSection;
  errors: PostgrestError[];
}

export async function data(ctx: PageContext): Promise<NewUnitData> {
  let { section_id } = ctx.routeParams;

  if (Array.isArray(section_id)) {
    section_id = section_id[0];
  } else if (typeof section_id == "undefined") {
    section_id = "0";
  }

  const query: IdsFromSection = await fetchIdsFromSectionId(
    parseInt(section_id)
  );

  const { firstData, error } = await selectFirst("sections", {
    match: { id: section_id },
  });

  const { col_id } = firstData;
  const errors = error == null ? [] : [error];
  return { section_id: ctx.query.section_id, col_id, query, errors };
}
