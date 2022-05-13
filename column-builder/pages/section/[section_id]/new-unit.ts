import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  UnitEditorModel,
  selectFirst,
  QueryI,
  getIdHierarchy,
} from "~/index";
import { persistNewUnitChanges } from "~/components/section/new-helpers";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let {
    query: { section_id },
  } = ctx;
  const query: QueryI = await getIdHierarchy({ section_id });
  const { firstData, error } = await selectFirst("sections", {
    match: { id: section_id },
  });

  const { col_id } = firstData;

  return {
    props: { section_id: ctx.query.section_id, col_id, query },
  };
};

function NewUnitInSection({
  col_id,
  section_id,
  query,
}: {
  col_id: number;
  section_id: string;
  query: QueryI;
}) {
  const model = { unit: { col_id: col_id }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistNewUnitChanges(
      updatedModel,
      changeSet,
      section_id,
      col_id
    );
  };

  return h(BasePage, { query }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
