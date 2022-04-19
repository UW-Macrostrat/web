import { hyperStyled } from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import {
  BasePage,
  ColumnGroupI,
  ColumnEditor,
  ColumnForm,
  useTableSelect,
  tableInsert,
} from "../../../src";
import styles from "../column.module.scss";
import { Spinner } from "@blueprintjs/core";
const h = hyperStyled(styles);

const getData = (col_group_id: number) => {
  // get all col_groups for project, find one matches col_group_id
  const colGroups: Partial<ColumnGroupI>[] = useTableSelect({
    tableName: "col_groups",
    columns: "id, col_group, col_group_long",
    match: col_group_id,
  });
  return colGroups;
};

export default function NewColumn({ col_group_id }: { col_group_id: string }) {
  const colGroups = getData(parseInt(col_group_id));

  if (!colGroups) return h(Spinner);
  const colGroup = colGroups[0];

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
    };

    const { data, error } = await tableInsert({
      tableName: "cols",
      row: newColumn,
    });

    if (!error) {
      // create new col_refs from new id
      const col_id: number = data[0].id;
      const ref_col = { ref_id: e.ref.id, col_id: col_id };

      const { data: data_, error } = await tableInsert({
        tableName: "col_refs",
        row: ref_col,
      });

      if (!error) {
        return e;
      } else {
        //catch errror
      }
    } else {
      //catch error
    }
  };

  return h(BasePage, { query: { col_group_id: parseInt(col_group_id) } }, [
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

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_group_id },
  } = ctx;

  return { props: { col_group_id } };
};
