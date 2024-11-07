import h from "@macrostrat/hyper";
import {
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
  tableUpdate,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";
import { EditColumnGroupData } from "./+data";

export function Page() {
  const { columnGroup, query, errors } = useData<EditColumnGroupData>();
  const persistChanges = async (
    e: Partial<ColumnGroupI>,
    changes: Partial<ColumnGroupI>
  ) => {
    const { data, error } = await tableUpdate("col_groups", {
      changes,
      id: e.id || 0,
    });
    if (!error) {
      return data[0];
    } else {
      console.error(error);
    }
  };

  return h(BasePage, { query, errors }, [
    h("h3", ["Edit Column Group: ", columnGroup.col_group_long]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: columnGroup, persistChanges }),
  ]);
}
