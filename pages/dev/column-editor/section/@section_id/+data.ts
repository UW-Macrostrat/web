import {
  UnitsView,
  fetchIdsFromSectionId,
  IdsFromSection,
} from "@macrostrat-web/column-builder";
import { PageContext } from "vike/types";
import { PostgrestError } from "@supabase/postgrest-js";
import { getSectionData } from "@macrostrat-web/column-builder/src/data-fetching";

export interface SectionData {
  section_id: string;
  query: IdsFromSection;
  sections: { [section_id: number | string]: UnitsView[] }[];
  errors: PostgrestError[];
}

export async function data(ctx: PageContext): Promise<SectionData> {
  let { section_id } = ctx.routeParams;

  if (Array.isArray(section_id)) {
    section_id = section_id[0];
  } else if (typeof section_id == "undefined") {
    section_id = "0";
  }

  const query: IdsFromSection = await fetchIdsFromSectionId(
    parseInt(section_id)
  );

  const { data: sections, error } = await getSectionData({ section_id });

  const errors = [error].filter((e) => e != null);
  return { section_id, query, sections, errors };
}
