import { hyperStyled } from "@macrostrat/hyper";
import {
  tableUpdate,
  BasePage,
  ColumnEditor,
  ColumnForm,
  tableSelect,
  selectFirst,
} from "../../../src";
import styles from "../column.module.scss";
import { GetServerSideProps } from "next";
const h = hyperStyled(styles);

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const {
    query: { col_id },
  } = ctx;

  const { data, error } = await tableSelect("col_form", {
    match: { col_id: col_id },
  });

  const { firstData, error: error_ } = await selectFirst("cols", {
    columns: "col_groups!cols_col_group_id_fkey1(*)",
    limit: 1,
  });

  return { props: { col_id, column: data, curColGroup: firstData.col_groups } };
};

export default function EditColumn(props: {
  col_id: string;
  curColGroup: any;
  column: ColumnForm[];
}) {
  const { col_id, curColGroup, column } = props;

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
    const { data, error } = await tableUpdate("cols", {
      changes,
      id: e.col_id,
    });

    if (!error) {
      if (ref_id) {
        const ref_col = { ref_id: ref_id };
        const { data: data_, error } = await tableUpdate("col_refs", {
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
      `Edit column ${column[0].col_name}, part of ${curColGroup.col_group_long}(${curColGroup.col_group}) Column Group`,
    ]),
    //@ts-ignore
    h(ColumnEditor, {
      model: column[0],
      persistChanges,
      curColGroup: curColGroup,
    }),
  ]);
}
