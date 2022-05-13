import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  UnitEditorModel,
  selectFirst,
} from "../../../src";
import { persistNewUnitChanges } from "../../../src/components/section/new-helpers";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { section_id },
  } = ctx;
  const { firstData, error } = await selectFirst("sections", {
    match: { id: section_id },
  });

  const { col_id } = firstData;

  return {
    props: { section_id: ctx.query.section_id, col_id },
  };
};

function NewUnitInSection({
  col_id,
  section_id,
}: {
  col_id: number;
  section_id: string;
}) {
  console.log(col_id, section_id);
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

  return h(BasePage, { query: { section_id: parseInt(section_id) } }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
