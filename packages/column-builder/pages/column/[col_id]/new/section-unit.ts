import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  fetchIdsFromColId,
  IdsFromCol,
  UnitsView,
} from "~/index";
import { persistNewUnitChanges } from "~/components/section/new-helpers";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let {
    query: { col_id },
  } = ctx;

  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }
  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  return {
    props: { col_id, query },
  };
};

function NewUnitInSection({
  col_id,
  query,
}: {
  col_id: number;
  query: IdsFromCol;
}) {
  const model = { unit: { col_id: col_id }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitsView,
    changeSet: Partial<UnitsView>
  ) => {
    return await persistNewUnitChanges(updatedModel, changeSet, null, col_id);
  };

  return h(BasePage, { query, errors: [] }, [
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default NewUnitInSection;
