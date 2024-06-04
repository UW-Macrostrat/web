import h from "@macrostrat/hyper";
import pg, {
  BasePage,
  UnitEditor,
  UnitsView,
  fetchIdsFromUnitId,
  IdsFromUnit,
} from "../../../src";
import { persistUnitChanges } from "../../../src/components/unit/edit-helpers";
import { GetServerSidePropsContext } from "next";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import { getSectionData } from "~/data-fetching";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  let {
    query: { unit_id },
  } = ctx;

  if (Array.isArray(unit_id)) {
    unit_id = unit_id[0];
  } else if (typeof unit_id == "undefined") {
    unit_id = "0";
  }

  const query: IdsFromUnit = await fetchIdsFromUnitId(parseInt(unit_id));

  const { data: units, error: e } = await getSectionData({ id: unit_id }, 1);

  // This is kind of crazy but it seems to work OK
  const unit = Object.values(units[0])[0][0];

  const errors = e == null ? [] : [e];
  return { props: { unit_id, unit, query, errors } };
}

/* 
Needs a strat_name displayer, we'll be stricter with editing that

Need interval suggest component (2), Need A color picker, Contact suggests.
Tags for liths and environs; adding components for those too.
*/
function UnitEdit(props: {
  unit_id: string;
  unit: UnitsView;
  query: IdsFromUnit;
  errors: PostgrestError[];
}) {
  const { unit, errors, unit_id } = props;

  const model = unit;
  console.log("UnitA", model);

  const persistChanges = async (
    updatedModel: UnitsView,
    changeSet: Partial<UnitsView>
  ) => {
    return await persistUnitChanges(unit, updatedModel, changeSet);
  };

  return h(BasePage, { query: props.query, errors }, [
    h("h3", [`Edit Unit #${unit.id}: `, unit.strat_name]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default UnitEdit;
