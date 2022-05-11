import h from "@macrostrat/hyper";
import { BasePage, UnitEditor, UnitEditorModel } from "../../../../src";
import { persistNewUnitChanges } from "../../../../src/components/section/new-helpers";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  return {
    props: { col_id },
  };
};

function NewUnitInSection({ col_id }: { col_id: number }) {
  const model = { unit: { col_id: col_id }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistNewUnitChanges(updatedModel, changeSet, null, col_id);
  };

  return h(BasePage, { query: { col_id } }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
