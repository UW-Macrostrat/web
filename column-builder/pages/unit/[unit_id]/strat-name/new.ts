import { hyperStyled } from "@macrostrat/hyper";
import {
  StratNameI,
  BasePage,
  StratNameEditor,
  tableInsert,
  tableUpdate,
  QueryI,
  getIdHierarchy,
} from "~/index";
import { GetServerSidePropsContext } from "next";
import styles from "./stratname.module.scss";

const h = hyperStyled(styles);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { unit_id, name },
  } = ctx;

  const query: QueryI = await getIdHierarchy({ unit_id });

  return { props: { unit_id, name, query } };
}

export default function NewStratName({
  name,
  unit_id,
  query,
}: {
  name: string | undefined;
  unit_id: number;
  query: QueryI;
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

  return h(BasePage, { query }, [
    h("h3", [pageTitle]),
    //@ts-ignore
    h(StratNameEditor, {
      model,
      persistChanges,
    }),
  ]);
}
