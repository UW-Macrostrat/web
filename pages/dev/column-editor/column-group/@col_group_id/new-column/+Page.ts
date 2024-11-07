import h from "@macrostrat/hyper";
import {
  BasePage,
  ColumnEditor,
  ColumnForm,
  tableInsert,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";
import { NewColumnData } from "./+data";

export function Page() {
  const { colGroup, col_group_id, errors } = useData<NewColumnData>();

  const persistChanges = async (
    e: ColumnForm,
    changes: Partial<ColumnForm>
  ) => {
    //create the correct column object for persistence.
    //       project_id, col_group_id, col (#), col_name, status_code, col_type
    //get the id back and enter that into the ref_col table
    const newColumn = {
      project_id: colGroup.project_id,
      col_group_id,
      col: e.col_number,
      col_name: e.col_name,
      status_code: "in process",
      col_type: "column",
      lat: e.lat,
      lng: e.lng,
    };

    const { data, error } = await tableInsert("cols", newColumn);

    if (!error) {
      // create new col_refs from new id
      const col_id: number = data[0].id;
      const ref_col = { ref_id: e.ref.id, col_id: col_id };

      const { data: data_, error } = await tableInsert("col_refs", ref_col);

      if (!error) {
        return e;
      } else {
        //catch errror
      }
    } else {
      //catch error
    }
  };

  return h(BasePage, { query: props.query, errors }, [
    h("h3", [
      `Add a new column to ${colGroup.col_group_long}(${colGroup.col_group})`,
    ]),
    //@ts-ignore
    h(ColumnEditor, {
      model: {},
      persistChanges,
      curColGroup: colGroup,
    }),
  ]);
}
