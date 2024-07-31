import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  UnitsView,
  persistNewUnitChanges,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";
import type { NewUnitData } from "./+data";

export function Page() {
  const { col_id, section_id, query, errors } = useData<NewUnitData>();

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
