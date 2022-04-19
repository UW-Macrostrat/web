import { hyperStyled } from "@macrostrat/hyper";
import { Spinner } from "@blueprintjs/core";
import {
  StratNameI,
  BasePage,
  StratNameEditor,
  useTableSelect,
  tableUpdate,
} from "../../src";
import { useRouter } from "next/router";
import styles from "./stratname.module.scss";
import { createLink } from "../../src/components/helpers";

const h = hyperStyled(styles);

export default function EditColumnGroup() {
  const router = useRouter();
  const { project_id, col_group_id, strat_name_id } = router.query;

  if (!strat_name_id) return h(Spinner);

  const strat_names: StratNameI[] = useTableSelect({
    tableName: "strat_names_view",
    match: parseInt(strat_name_id),
  });

  if (!strat_names) return h(Spinner);

  const persistChanges = async (
    e: StratNameI,
    changes: Partial<StratNameI>
  ) => {
    const { data, error } = await tableUpdate({
      tableName: "strat_names",
      changes,
      id: e.id,
    });

    if (!error) {
      router.push(createLink("/units/edit", { ...router.query }));
      return data[0];
    } else {
      console.error(error);
    }
  };

  const strat_name = strat_names[0];

  return h(BasePage, { query: router.query }, [
    h("h3", ["Edit Stratigraphic Name ", strat_name.strat_name]),
    //@ts-ignore
    h(StratNameEditor, { model: strat_name, persistChanges }),
  ]);
}
