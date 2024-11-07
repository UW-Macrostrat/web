import h from "@macrostrat/hyper";
import {
  BasePage,
  EditButton,
  UnitSectionTable,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";
import { ColumnProps } from "./+data";

export function Page() {
  const props: ColumnProps = useData();
  const { col_id, colSections, column, query, sections, errors } = props;

  const columnName = column ? column[0].col_name : null;

  return h(BasePage, { query, errors }, [
    h("h3", [
      `Sections for Column: ${columnName}`,
      h(EditButton, {
        href: `./${col_id}/edit`,
      }),
    ]),
    // there doesn't appear to be a good solution yet, so this is the best we can do. It loses the SSR
    // for this component unfortunately
    h(UnitSectionTable, { sections, colSections, col_id }),
  ]);
}
