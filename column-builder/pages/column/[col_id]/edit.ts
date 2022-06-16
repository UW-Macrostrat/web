import h from "@macrostrat/hyper";
import {
  tableUpdate,
  BasePage,
  ColumnEditor,
  ColumnForm,
  tableSelect,
  selectFirst,
  fetchIdsFromColId,
  IdsFromCol,
} from "~/index";
import { GetServerSideProps } from "next";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  let {
    query: { col_id },
  } = ctx;
  if (Array.isArray(col_id)) {
    col_id = col_id[0];
  }

  const query: IdsFromCol = await fetchIdsFromColId(parseInt(col_id ?? "0"));

  const { data, error }: PostgrestResponse<ColumnForm> = await tableSelect(
    "col_ref_expanded",
    {
      match: { col_id: parseInt(col_id ?? "0") },
    }
  );

  const { firstData, error: error_ } = await selectFirst("cols", {
    columns: "col_groups!cols_col_group_id_fkey(*)",
    limit: 1,
  });

  const errors = [error, error_].filter((e) => e != null);

  return {
    props: {
      col_id,
      column: data,
      curColGroup: firstData.col_groups,
      query,
      errors,
    },
  };
};

export default function EditColumn(props: {
  col_id: string;
  curColGroup: any;
  column: ColumnForm[];
  query: IdsFromCol;
  errors: PostgrestError[];
}) {
  const { col_id, curColGroup, column, errors } = props;

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

  return h(BasePage, { query: props.query, errors }, [
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
