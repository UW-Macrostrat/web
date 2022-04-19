import { hyperStyled } from "@macrostrat/hyper";
import pg, {
  usePostgrest,
  useTableSelect,
  tableUpdate,
  BasePage,
  ColumnEditor,
  ColumnForm,
} from "../../../src";
import styles from "../column.module.scss";
import { Spinner } from "@blueprintjs/core";
import { GetServerSideProps } from "next";
const h = hyperStyled(styles);

const getData = (col_id: any) => {
  // get all col_groups for project, find one matches col_group_id
  // const colGroups: Partial<ColumnGroupI>[] = useTableSelect({
  //   tableName: "col_groups",
  //   columns: "id, col_group, col_group_long",
  //   match: { project_id: project_id },
  // });

  const column: ColumnForm[] = useTableSelect({
    tableName: "col_form",
    match: { col_id: col_id },
  });

  // fancy join
  //https://supabase.com/docs/reference/javascript/select#query-foreign-tables
  const data = usePostgrest(
    pg.from("cols").select("col_groups!cols_col_group_id_fkey1(*)").limit(1)
  );
  console.log(data);

  return { colGroups: data, column };
};

export default function EditColumn({ col_id }: { col_id: string }) {
  const { colGroups, column } = getData(col_id);

  if (!colGroups || !column) return h(Spinner);
  const curColGroup = colGroups[0].col_groups;

  const persistChanges = async (
    e: ColumnForm,
    changes: Partial<ColumnForm>
  ) => {
    console.log(e, changes);
    // port names to match db (only col_numer -> col)
    let ref_id: number | undefined = undefined;
    if (changes.col_number) {
      changes.col = changes.col_number;
      delete changes.col_number;
    }
    if (changes.ref) {
      // handle the changing of a ref, either one that exists or was created
      ref_id = changes.ref.id;
      delete changes.ref;
    }
    const { data, error } = await tableUpdate({
      tableName: "cols",
      changes,
      id: e.col_id,
    });

    if (!error) {
      if (ref_id) {
        const ref_col = { ref_id: ref_id };
        const { data: data_, error } = await tableUpdate({
          tableName: "col_refs",
          changes: ref_col,
          id: { col_id: e.col_id },
        });
      }
      if (error) {
        //catch errror
      }
      return e;
    } else {
      //catch error
    }

    // check if ref has changed

    return e;
  };

  return h(BasePage, { query: { col_id: parseInt(col_id) } }, [
    h("h3", [
      `Edit column ${column[0].col_name}, part of ${curColGroup.col_group_long}(${curColGroup.col_group})`,
    ]),
    //@ts-ignore
    h(ColumnEditor, {
      model: column[0],
      persistChanges,
      curColGroup: curColGroup,
    }),
  ]);
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;
  return { props: { col_id } };
};
