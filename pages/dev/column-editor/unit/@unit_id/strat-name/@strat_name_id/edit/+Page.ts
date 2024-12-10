import {
  BasePage,
  StratNameEditor,
  StratNameI,
  tableUpdate,
} from "@macrostrat-web/column-builder";
import h from "../stratname.module.scss";
import { useData } from "vike-react/useData";
import type { EditStratigraphicNameData } from "./+data";

export default function EditStratigraphicName() {
  const { strat_name, errors } = useData<EditStratigraphicNameData>();

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
    h("h3", [
      "Edit Stratigraphic Name and Hierarchy for ",
      strat_name.strat_name,
      " ",
      strat_name.rank,
    ]),
    //@ts-ignore
    h(StratNameEditor, { model: strat_name, persistChanges }),
  ]);
}
