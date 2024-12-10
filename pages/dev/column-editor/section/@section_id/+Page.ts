import h from "@macrostrat/hyper";
import { BasePage, UnitSectionTable } from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";
import type { SectionData } from "./+data";

export function Page() {
  const { section_id, sections, errors } = useData<SectionData>();

  return h(BasePage, { query: props.query, errors }, [
    h("h3", [`Units in Section #${section_id}`]),
    h(UnitSectionTable, {
      sections,
      colSections: [],
      col_id: props.query.col_id,
    }),
  ]);
}
