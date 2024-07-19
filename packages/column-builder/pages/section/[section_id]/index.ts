import h from "@macrostrat/hyper";
import pg, {
  UnitsView,
  fetchIdsFromSectionId,
  IdsFromSection,
  UnitSectionTable,
} from "~/index";
import { BasePage } from "~/index";
import { GetServerSideProps } from "next";
import { PostgrestError } from "@supabase/postgrest-js";
import { getSectionData } from "~/data-fetching";

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

  const {data: sections, error} = await getSectionData({section_id})

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
