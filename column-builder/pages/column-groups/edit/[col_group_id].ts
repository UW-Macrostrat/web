import { hyperStyled } from "@macrostrat/hyper";
import {
  useTableSelect,
  BasePage,
  ColumnGroupEditor,
  ColumnGroupI,
  tableUpdate,
} from "../../../src";
import styles from "../colgroup.module.scss";
import { Spinner } from "@blueprintjs/core";
import { GetServerSidePropsContext } from "next";
const h = hyperStyled(styles);

export default function EditColumnGroup({
  col_group_id,
}: {
  col_group_id: string;
}) {
  const colGroups: Partial<ColumnGroupI>[] = useTableSelect({
    tableName: "col_groups",
    match: parseInt(col_group_id),
  });

  if (!colGroups) return h(Spinner);

  const columnGroup: Partial<ColumnGroupI> = colGroups[0];

  const persistChanges = async (
    e: Partial<ColumnGroupI>,
    changes: Partial<ColumnGroupI>
  ) => {
    const { data, error } = await tableUpdate({
      tableName: "col_groups",
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

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { col_group_id },
  } = ctx;

  return { props: { col_group_id } };
}
