import { apiV2Prefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";

export async function fetchAPIData(apiURL: string, params: any) {
  let url = new URL(apiV2Prefix + apiURL);
  if (params != null) {
    url.search = new URLSearchParams(params).toString();
  }
  console.log(url.toString());
  const res = await fetch(url.toString());
  const res1 = await res.json();
  return res1?.success?.data;
}

export type ColumnGroup = {
  id: number;
  name: string;
  columns: Array<any>;
};

export async function getGroupedColumns(project_id) {
  const [columns, groups] = await Promise.all([
    fetchAPIData(`/defs/columns`, { project_id }),
    fetchAPIData(`/defs/groups`, { project_id }),
  ]);

  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group

  const columnGroupIx: { [ix: number]: ColumnGroup } = columns.reduce(
    (acc, d) => {
      const { col_group_id } = d;

      const col_group =
        groups.find((d) => d.col_group_id == col_group_id) ?? {};

      acc[col_group_id] ??= {
        id: col_group_id,
        ...col_group,
        columns: [],
      };
      acc[col_group_id].columns.push(d);
      return acc;
    },
    {}
  );

  const columnGroups = Object.values(columnGroupIx);
  columnGroups.sort((a, b) => a.id - b.id);
  return columnGroups;
}
