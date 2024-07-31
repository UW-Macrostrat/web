import h from "@macrostrat/hyper";
import {
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
  tableSelect,
  tableUpdate,
  IdsFromColGroup,
  fetchIdsFromColGroup,
} from "../../../../packages/column-builder";
import { GetServerSidePropsContext } from "next";
import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  let {
    query: { col_group_id },
  } = ctx;
  if (Array.isArray(col_group_id)) {
    col_group_id = col_group_id[0];
  }

  const query: IdsFromColGroup = await fetchIdsFromColGroup(
    parseInt(col_group_id ?? "0")
  );

  const { data, error }: PostgrestResponse<Partial<ColumnGroupI>> =
    await tableSelect("col_groups", {
      match: { id: col_group_id ?? "0" },
    });

  const columnGroup = data ? data[0] : {};
  const errors = [error].filter((e) => e != null);
  return { props: { col_group_id, columnGroup, query, errors } };
}

export default function EditColumnGroup({
  columnGroup,
  query,
  errors,
}: {
  errors: PostgrestError[];
  columnGroup: Partial<ColumnGroupI>;
  query: IdsFromColGroup;
}) {
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
