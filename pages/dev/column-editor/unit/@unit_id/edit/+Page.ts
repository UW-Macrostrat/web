import h from "@macrostrat/hyper";
import {
  BasePage,
  UnitEditor,
  UnitsView,
} from "@macrostrat-web/column-builder";
import { persistUnitChanges } from "@macrostrat-web/column-builder/src/components/unit/edit-helpers";
import { useData } from "vike-react/useData";
import type { UnitEditParams } from "./+data";

/*
Needs a strat_name displayer, we'll be stricter with editing that

Need interval suggest component (2), Need A color picker, Contact suggests.
Tags for liths and environs; adding components for those too.
*/
export function Page() {
  const { unit, errors, unit_id, query } = useData<UnitEditParams>();

  const model = unit;
  console.log("UnitA", model);

  const persistChanges = async (
    updatedModel: UnitsView,
    changeSet: Partial<UnitsView>
  ) => {
    return await persistUnitChanges(unit, updatedModel, changeSet);
  };

  return h(BasePage, { query, errors }, [
    h("h3", [`Edit Unit #${unit.id}: `, unit.strat_name]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}
