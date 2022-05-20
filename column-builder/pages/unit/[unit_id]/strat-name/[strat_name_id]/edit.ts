import { hyperStyled } from "@macrostrat/hyper";
import {
  StratNameI,
  BasePage,
  StratNameEditor,
  tableUpdate,
  selectFirst,
  getIdHierarchy,
  QueryI,
} from "~/index";
import { GetServerSidePropsContext } from "next";
import styles from "../stratname.module.scss";
import { PostgrestError } from "@supabase/postgrest-js";

const h = hyperStyled(styles);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { strat_name_id, unit_id },
  } = ctx;
  const query = await getIdHierarchy({ unit_id });
  const { firstData: strat_name, error } = await selectFirst(
    "strat_names_ref",
    {
      match: { id: strat_name_id },
    }
  );
  const errors = error == null ? [] : [error];
  return { props: { strat_name_id, strat_name, errors, unit_id, query } };
}

export default function EditColumnGroup(props: {
  strat_name_id: number;
  strat_name: StratNameI;
  unit_id: number;
  query: QueryI;
  errors: PostgrestError[];
}) {
  const { strat_name, errors } = props;

  const persistChanges = async (
    e: StratNameI,
    changes: Partial<StratNameI>
  ) => {
    const { data, error } = await tableUpdate("strat_names", {
      changes,
      id: e.id,
    });

    if (!error) {
      return data[0];
    } else {
      console.error(error);
    }
  };

  return h(BasePage, { query: props.query, errors }, [
    h("h3", ["Edit Stratigraphic Name ", strat_name.strat_name]),
    //@ts-ignore
    h(StratNameEditor, { model: strat_name, persistChanges }),
  ]);
}
