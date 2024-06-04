import { hyperStyled } from "@macrostrat/hyper";
import {
  StratNameI,
  BasePage,
  StratNameEditor,
  tableInsert,
  tableUpdate,
  IdsFromUnit,
  fetchIdsFromUnitId,
} from "~/index";
import { GetServerSidePropsContext } from "next";
import styles from "./stratname.module.scss";

const h = hyperStyled(styles);

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

  return { props: { unit_id, query } };
}

export default function NewStratName({
  name,
  unit_id,
  query,
}: {
  name: string | undefined;
  unit_id: number;
  query: IdsFromUnit;
}) {
  const persistChanges = async (e: StratNameI, c: Partial<StratNameI>) => {
    const { data, error } = await tableInsert("strat_names", e);

    const strat_name_id: number = data ? data[0].id : null;

    if (!strat_name_id) {
      const { data, error } = await tableUpdate("units", {
        changes: { strat_name_id: strat_name_id },
        id: unit_id,
      });

      return data[0];
    } else {
      console.error(error);
    }
  };

  let model: Partial<StratNameI> = {};
  if (name != undefined && typeof name == "string") {
    model.strat_name = name;
  }

  const pageTitle =
    name == undefined
      ? "Make New Stratigraphic Name "
      : "This Stratigraphic name doesn't exist in the database. Make New Stratigraphic Name";

  return h(BasePage, { query, errors: [] }, [
    h("h3", [pageTitle]),
    //@ts-ignore
    h(StratNameEditor, {
      model,
      persistChanges,
      new_name: true,
    }),
  ]);
}
