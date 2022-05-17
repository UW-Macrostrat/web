import h from "@macrostrat/hyper";
import {
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
  tableSelect,
  tableUpdate,
  getIdHierarchy,
  QueryI,
} from "~/index";
import { GetServerSidePropsContext } from "next";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { col_group_id },
  } = ctx;

  const { data, error } = await tableSelect("col_groups", {
    match: { id: col_group_id },
  });

  const columnGroup = data ? data[0] : {};
  const query = await getIdHierarchy({ col_group_id });

  return { props: { col_group_id, columnGroup, query } };
}

export default function EditColumnGroup({
  columnGroup,
  query,
}: {
  columnGroup: Partial<ColumnGroupI>;
  query: QueryI;
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

  return h(BasePage, { query }, [
    h("h3", ["Edit Column Group: ", columnGroup.col_group_long]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: columnGroup, persistChanges }),
  ]);
}
