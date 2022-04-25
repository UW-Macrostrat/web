import h from "@macrostrat/hyper";
import {
  UnitEditorModel,
  BasePage,
  UnitEditor,
  UnitsView,
  EnvironUnit,
  LithUnit,
  tableSelect,
  selectFirst,
} from "../../../src";
import { persistUnitChanges } from "./edit-helpers";
import { GetServerSidePropsContext } from "next";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { unit_id },
  } = ctx;

  const { firstData: unit, error } = await selectFirst(
    "unit_strat_name_expanded",
    {
      match: { id: unit_id },
      limit: 1,
    }
  );

  const { data: envs, error: error_ } = await tableSelect("environ_unit", {
    match: { unit_id: unit_id },
  });

  const { data: liths, error: _error } = await tableSelect("lith_unit", {
    match: { unit_id: unit_id },
  });
  return { props: { unit_id, unit, envs, liths } };
}

/* 
Needs a strat_name displayer, we'll be stricter with editing that

Need interval suggest component (2), Need A color picker, Contact suggests.
Tags for liths and environs; adding components for those too.
*/
function UnitEdit(props: {
  unit_id: string;
  unit: UnitsView;
  envs: EnvironUnit[];
  liths: LithUnit[];
}) {
  const { unit, envs, liths, unit_id } = props;

  const model = { unit, envs, liths };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistUnitChanges(unit, envs, liths, updatedModel, changeSet);
  };

  return h(BasePage, { query: { unit_id: parseInt(unit_id) } }, [
    h("h3", [`Edit Unit #${unit.id}: `, unit.unit_strat_name]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default UnitEdit;
