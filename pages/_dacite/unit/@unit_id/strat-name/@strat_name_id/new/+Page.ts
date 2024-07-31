import {
  BasePage,
  StratNameEditor,
  StratNameI,
  tableInsert,
  tableUpdate,
} from "@macrostrat-web/column-builder";
import h from "../stratname.module.scss";
import { useData } from "vike-react/useData";
import type { StratNameData } from "./+data";

export default function Page() {
  const { name, unit_id, query } = useData<StratNameData>();
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
