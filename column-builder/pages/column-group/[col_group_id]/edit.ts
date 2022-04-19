import h from "@macrostrat/hyper";
import {
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
  tableSelect,
  tableUpdate,
} from "../../../src";
import { GetServerSidePropsContext } from "next";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { col_group_id },
  } = ctx;

  const { data, error } = await tableSelect("col_groups", {
    match: { id: col_group_id },
  });

  const columnGroup = data ? data[0] : {};

  return { props: { col_group_id, columnGroup } };
}

export default function EditColumnGroup({
  col_group_id,
  columnGroup,
}: {
  columnGroup: Partial<ColumnGroupI>;
  col_group_id: string;
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

  return h(BasePage, { query: { col_group_id: parseInt(col_group_id) } }, [
    h("h3", ["Edit Column Group: ", columnGroup.col_group_long]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: columnGroup, persistChanges }),
  ]);
}
