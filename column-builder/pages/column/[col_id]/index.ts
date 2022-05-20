import h from "@macrostrat/hyper";
import { PostgrestError } from "@supabase/postgrest-js";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  EditButton,
  createUnitBySections,
  UnitsView,
  ColSectionI,
  getIdHierarchy,
  QueryI,
  UnitSectionTable,
  isServer,
} from "~/index";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  const { data: d, error: e } = await pg.rpc("get_col_section_data", {
    column_id: col_id,
  });

  const query = await getIdHierarchy({ col_id });

  const { data: column, error: col_error } = await pg
    .from("cols")
    .select("col_name")
    .match({ id: col_id });

  const { data: units, error: unit_error } = await pg
    .from("unit_strat_name_expanded")
    .select(
      /// joins the lith_unit and environ_unit table
      "*,lith_unit!unit_liths_unit_id_fkey(*),environ_unit!unit_environs_unit_id_fkey(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ col_id: col_id });

  const sections = createUnitBySections(units);

  const errors = [e, col_error, unit_error].filter((e) => e != null);
  return {
    props: {
      col_id,
      colSections: d,
      column,
      errors,
      query,
      sections,
    },
  };
};

export default function Columns(props: {
  col_id: string;
  colSections: ColSectionI[];
  column: { col_name: string }[];
  errors: PostgrestError[];
  query: QueryI;
  sections: { [section_id: number | string]: UnitsView[] }[];
}) {
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
    h.if(!isServer())(UnitSectionTable, { sections, colSections }),
  ]);
}
