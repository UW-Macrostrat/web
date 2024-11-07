import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  IdsFromCol,
  UnitsView,
} from "@macrostrat-web/column-builder";
import { persistNewUnitChanges } from "@macrostrat-web/column-builder/src/components/section/new-helpers";
import { useData } from "vike-react/useData";
import type { NewUnitData } from "./+data";

function Page() {
  const { col_id, query }: NewUnitData = useData();
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
