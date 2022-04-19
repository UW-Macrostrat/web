import { hyperStyled } from "@macrostrat/hyper";
import { GetServerSideProps } from "next";
import pg, {
  BasePage,
  ColumnGroupI,
  ColumnEditor,
  ColumnForm,
  tableInsert,
} from "../../../src";
import styles from "../column.module.scss";
const h = hyperStyled(styles);

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_group_id },
  } = ctx;

  const { data, error } = await pg
    .from("col_groups")
    .select("id, col_group, col_group_long")
    .match({ id: col_group_id });

  const colGroup = data ? data[0] : {};

  return { props: { col_group_id, colGroup } };
};

export default function NewColumn(props: {
  col_group_id: string;
  colGroup: Partial<ColumnGroupI>;
}) {
  const { colGroup, col_group_id } = props;

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
