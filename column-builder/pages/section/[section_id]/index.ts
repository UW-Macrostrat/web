import h from "@macrostrat/hyper";
import pg, {
  UnitsView,
  fetchIdsFromSectionId,
  IdsFromSection,
  createUnitBySections,
  UnitSectionTable,
} from "~/index";
import { BasePage } from "~/index";
import { GetServerSideProps } from "next";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let {
    query: { section_id },
  } = ctx;

  if (Array.isArray(section_id)) {
    section_id = section_id[0];
  } else if (typeof section_id == "undefined") {
    section_id = "0";
  }

  const query: IdsFromSection = await fetchIdsFromSectionId(
    parseInt(section_id)
  );

  const { data, error }: PostgrestResponse<UnitsView> = await pg
    .from("unit_strat_name_expanded")
    .select(
      "*,strat_names(*, strat_names_meta(*)),lith_unit!unit_liths_unit_id_fkey(*),environ_unit!unit_environs_unit_id_fkey(*)"
    )
    .order("position_bottom", { ascending: true })
    .match({ section_id: section_id });

  const sections = createUnitBySections(data);

  const errors = [error].filter((e) => e != null);
  return { props: { section_id, query, sections, errors } };
};

function Section(props: {
  section_id: string;
  query: IdsFromSection;
  sections: { [section_id: number | string]: UnitsView[] }[];
  errors: PostgrestError[];
}) {
  const { section_id, sections, errors } = props;

  return h(BasePage, { query: props.query, errors }, [
    h("h3", [`Units in Section #${section_id}`]),
    h(UnitSectionTable, {
      sections,
      colSections: [],
      col_id: props.query.col_id,
    }),
  ]);
}

export default Section;
