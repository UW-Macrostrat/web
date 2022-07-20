import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  selectFirst,
  IdsFromSection,
  fetchIdsFromSectionId,
  UnitsView,
} from "~/index";
import { persistNewUnitChanges } from "~/components/section/new-helpers";
import { GetServerSideProps } from "next";
import { PostgrestError } from "@supabase/postgrest-js";

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

  const { firstData, error } = await selectFirst("sections", {
    match: { id: section_id },
  });

  const { col_id } = firstData;
  const errors = error == null ? [] : [error];
  return {
    props: { section_id: ctx.query.section_id, col_id, query, errors },
  };
};

function NewUnitInSection({
  col_id,
  section_id,
  query,
  errors,
}: {
  col_id: number;
  section_id: string;
  query: IdsFromSection;
  errors: PostgrestError[];
}) {
  const model = { unit: { col_id: col_id }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitsView,
    changeSet: Partial<UnitsView>
  ) => {
    return await persistNewUnitChanges(
      updatedModel,
      changeSet,
      section_id,
      col_id
    );
  };

  return h(BasePage, { query, errors }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
