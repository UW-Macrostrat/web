import h from "@macrostrat/hyper";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import { GetServerSideProps } from "next";
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
} from "~/index";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let {
    query: { col_id },
  } = ctx;
  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }

  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  const { data: colSections, error: e }: PostgrestResponse<ColSectionI> =
    await pg.rpc("get_col_section_data", {
      column_id: col_id,
    });

  const {
    data: column,
    error: col_error,
  }: PostgrestResponse<{ col_name: string }> = await pg
    .from("cols")
    .select("col_name")
    .match({ id: col_id });

  const { data: units, error: unit_error }: PostgrestResponse<any> =
    await pg
      .from("units")
      .select(
        /// joins the lith_unit and environ_unit table
        "*, unit_strat_name_expanded(*,strat_names(*, strat_names_meta(*))),lith_unit(*),environ_unit(*)"
      )
      .order("position_bottom", { ascending: true })
      .match({ col_id: col_id });
  
  const u1 = units ?? [];

  
  const unitsMapped: UnitsView[] = u1.map(d => {
    const { unit_strat_name_expanded, ...rest } = d;
    return { ...rest, strat_names: unit_strat_name_expanded };
  });

  console.log(unitsMapped);


  const sections: { [section_id: string | number]: UnitsView[] }[] =
    createUnitBySections(unitsMapped);

  const errors = [e, col_error, unit_error].filter((e) => e != null);
  return {
    props: {
      col_id,
      colSections,
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
  query: IdsFromCol;
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
    h.if(!isServer())(UnitSectionTable, { sections, colSections, col_id }),
  ]);
}
