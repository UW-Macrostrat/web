import pg, {
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
} from "@macrostrat-web/column-builder";
import h from "../colgroup.module.scss";
import { useData } from "vike-react/useData";
import type { NewColumnGroupParams } from "./+data";

export function Page() {
  const { project, project_id, errors } = useData<NewColumnGroupParams>();

  const newColumnGroup: Partial<ColumnGroupI> = {
    col_group: "",
    col_group_long: "",
  };

  const persistChanges = async (
    columnGroup: Partial<ColumnGroupI>,
    c: Partial<ColumnGroupI>
  ) => {
    const { data, error } = await pg
      .from("col_groups")
      .insert([{ ...columnGroup, project_id: project_id }]);
    if (!error) {
      return data[0];
    } else {
      //catch error
    }
  };

  return h(BasePage, { query: { project_id }, errors }, [
    h("h3", ["Create a New Column Group for ", project.project]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: newColumnGroup, persistChanges }),
  ]);
}
