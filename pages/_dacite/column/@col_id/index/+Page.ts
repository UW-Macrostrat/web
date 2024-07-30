import h from "@macrostrat/hyper";
import { PostgrestError } from "@supabase/postgrest-js";
import pg, {
  BasePage,
  EditButton,
  createUnitBySections,
  UnitsView,
  ColSectionI,
  fetchIdsFromColId,
  IdsFromCol,
  UnitSectionTable,
  isServer,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";

export function Page() {
  const props: {
    col_id: string;
    colSections: ColSectionI[];
    column: { col_name: string }[];
    errors: PostgrestError[];
    query: IdsFromCol;
    sections: { [section_id: number | string]: UnitsView[] }[];
  } = useData();
  const { col_id, colSections, column, query, sections, errors } = props;

  const columnName = column ? column[0].col_name : null;

  return h(BasePage, { query, errors }, [
    h("h3", [
      `Sections for Column: ${columnName}`,
      h(EditButton, {
        href: `/column/${col_id}/edit`,
      }),
    ]),
    // there doesn't appear to be a good solution yet, so this is the best we can do. It loses the SSR
    // for this component unfortunately
    h.if(!isServer())(UnitSectionTable, { sections, colSections, col_id }),
  ]);
}
