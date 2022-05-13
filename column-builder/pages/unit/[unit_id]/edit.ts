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
  getIdHierarchy,
  QueryI,
} from "../../../src";
import { persistUnitChanges } from "../../../src/components/unit/edit-helpers";
import { GetServerSidePropsContext } from "next";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { unit_id },
  } = ctx;
  const query: QueryI = await getIdHierarchy({ unit_id });
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

  return { props: { unit_id, unit, envs, liths, query } };
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
  query: QueryI;
}) {
  const { unit, envs, liths, unit_id } = props;

  const model = { unit, envs, liths };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistUnitChanges(unit, envs, liths, updatedModel, changeSet);
  };

  return h(BasePage, { query: props.query }, [
    h("h3", [`Edit Unit #${unit.id}: `, unit.unit_strat_name]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default UnitEdit;
