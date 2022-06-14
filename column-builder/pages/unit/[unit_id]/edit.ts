import h from "@macrostrat/hyper";
import pg, {
  UnitEditorModel,
  BasePage,
  UnitEditor,
  UnitsView,
  getIdHierarchy,
  QueryI,
} from "../../../src";
import { persistUnitChanges } from "../../../src/components/unit/edit-helpers";
import { GetServerSidePropsContext } from "next";
import { PostgrestError } from "@supabase/postgrest-js";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { unit_id },
  } = ctx;
  const query: QueryI = await getIdHierarchy({ unit_id });

  const { data: units, error: e } = await pg
    .from("unit_strat_name_expanded")
    .select(
      "*,lith_unit!unit_liths_unit_id_fkey(*),environ_unit!unit_environs_unit_id_fkey(*)"
    )
    .match({ id: unit_id })
    .limit(1);

  const errors = e == null ? [] : [e];
  return { props: { unit_id, unit: units[0], query, errors } };
}

/* 
Needs a strat_name displayer, we'll be stricter with editing that

Need interval suggest component (2), Need A color picker, Contact suggests.
Tags for liths and environs; adding components for those too.
*/
function UnitEdit(props: {
  unit_id: string;
  unit: UnitsView;
  query: QueryI;
  errors: PostgrestError[];
}) {
  const { unit, errors } = props;

  const model = { unit };
  console.log(unit);

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistUnitChanges(unit, updatedModel, changeSet);
  };

  return h(BasePage, { query: props.query, errors }, [
    h("h3", [`Edit Unit #${unit.id}: `, unit.unit_strat_name]),
    //@ts-ignore
    h(UnitEditor, { model, persistChanges }),
  ]);
}

export default UnitEdit;
