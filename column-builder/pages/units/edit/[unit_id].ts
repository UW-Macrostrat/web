import { hyperStyled } from "@macrostrat/hyper";
import { UnitEditorModel, BasePage, UnitEditor } from "../../../src";
import { Spinner } from "@blueprintjs/core";
import { getUnitData, persistUnitChanges } from "./edit-helpers";
import styles from "../units.module.scss";
import { GetServerSidePropsContext } from "next";
const h = hyperStyled(styles);

/* 
Needs a strat_name displayer, we'll be stricter with editing that

Need interval suggest component (2), Need A color picker, Contact suggests.
Tags for liths and environs; adding components for those too.
*/
function UnitEdit({ unit_id }: { unit_id: string }) {
  const { units, envs, liths } = getUnitData(parseInt(unit_id));
  if (!units || !envs || !liths) return h(Spinner);
  const unit = units[0];

  const model = { unit, envs, liths };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistUnitChanges(unit, envs, liths, updatedModel, changeSet);
  };

  return h(BasePage, { query: { unit_id: parseInt(unit_id) } }, [
    h("h3", [
      "Edit Unit: ",
      unit.unit_strat_name ||
        `${unit.strat_name?.strat_name} ${unit.strat_name.rank}`,
    ]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return { props: { unit_id: ctx.query.unit_id } };
}
export default UnitEdit;
