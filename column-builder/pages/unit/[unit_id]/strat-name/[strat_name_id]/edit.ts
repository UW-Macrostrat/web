import { hyperStyled } from "@macrostrat/hyper";
import {
  StratNameI,
  BasePage,
  StratNameEditor,
  tableUpdate,
  selectFirst,
} from "../../../../../src";
import { GetServerSidePropsContext } from "next";
import styles from "../stratname.module.scss";

const h = hyperStyled(styles);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { strat_name_id, unit_id },
  } = ctx;

  const { firstData: strat_name, error } = await selectFirst(
    "strat_names_view",
    {
      match: { id: strat_name_id },
    }
  );

  return { props: { strat_name_id, strat_name, unit_id } };
}

export default function EditColumnGroup(props: {
  strat_name_id: number;
  strat_name: StratNameI;
  unit_id: number;
}) {
  const { strat_name_id, strat_name, unit_id } = props;

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

  return h(BasePage, { query: { unit_id } }, [
    h("h3", ["Edit Stratigraphic Name ", strat_name.strat_name]),
    //@ts-ignore
    h(StratNameEditor, { model: strat_name, persistChanges }),
  ]);
}
