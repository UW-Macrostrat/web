import h from "@macrostrat/hyper";
import pg, {
  BasePage,
  ColumnEditor,
  ColumnForm,
  IdsFromCol,
  tableUpdate,
} from "@macrostrat-web/column-builder";
import { PostgrestError } from "@supabase/postgrest-js";
import { useData } from "vike-react/useData";
import { StratColumn } from "./strat-column";

interface EditColumnData {
  col_id: string;
  curColGroup: any;
  column: ColumnForm[];
  query: IdsFromCol;
  errors: PostgrestError[];
}

export function Page() {
  const props = useData();
  const { col_id, curColGroup, column, errors }: EditColumnData = props;
  const persistChanges = async (
    e: ColumnForm,
    changes: Partial<ColumnForm>
  ) => {
    console.log(e, changes);
    // port names to match db (only col_numer -> col)
    let ref_id: number | undefined = undefined;
    if (changes.refs) {
      // handle the changing of a ref, either one that exists or was created
      ref_id = changes.refs[0].id;
      delete changes.refs;
    }
    // lat,lng only need to be entered to update coordinate and wkt.
    //  DB triggers, see /api-views/02-functions.sql
    const { data, error } = await tableUpdate("cols", {
      changes,
      id: e.id,
    });

    if (!error) {
      if (ref_id) {
        const ref_col = { ref_id: ref_id };
        const { data: count, error: _ } = await pg
          .from("col_refs")
          .select()
          .match({ col_id: e.id });
        if (count?.length ?? 0 > 1) {
          const { data: data_, error } = await pg
            .from("col_refs")
            .update({ ref_id })
            .match({ col_id: e.id });
        } else {
          const { data: data_, error } = await pg
            .from("col_refs")
            .insert([{ ref_id, col_id: e.id }]);
        }
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
    h(FlexRow, [
      h(ColumnEditor, {
        model: column[0],
        persistChanges,
        curColGroup: curColGroup,
      }),
      h(StratColumn, { col_id }),
    ]),
  ]);
}
