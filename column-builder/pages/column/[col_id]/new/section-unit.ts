import h from "@macrostrat/hyper";
import {
  BasePage,
  getIdHierarchy,
  QueryI,
  UnitEditor,
  UnitEditorModel,
} from "~/index";
import { persistNewUnitChanges } from "~/components/section/new-helpers";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  const query = await getIdHierarchy({ col_id });

  return {
    props: { col_id, query },
  };
};

function NewUnitInSection({
  col_id,
  query,
}: {
  col_id: number;
  query: QueryI;
}) {
  const model = { unit: { col_id: col_id }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistNewUnitChanges(updatedModel, changeSet, null, col_id);
  };

  return h(BasePage, { query }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
