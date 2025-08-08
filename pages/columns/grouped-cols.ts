import { fetchAPIData, fetchPGData } from "~/_utils";

export async function getGroupedColumns(project_id: number | null, params?: any) {
  let columnURL = "/col_data";
  if (project_id == null) {
    // The 'columns' route gives all columns in active projects
  } else {
    // Only get columns for a specific project
    params = { project_id };
  }

  const [columns, groups] = await Promise.all([
    fetchPGData(columnURL, params),
    fetchAPIData(`/defs/groups`, { ...params, all: true}),
  ]);

  if(!columns) {
    return null
  }

  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group
  // Create a map of column groups
  const groupMap = new Map<number, ColumnGroup>(
    groups.map((g) => [
      g.col_group_id,
      { name: g.name, id: g.col_group_id, columns: [] },
    ])
  );
  groupMap.set(-1, {
    id: -1,
    name: "Ungrouped",
    columns: [],
  });

  for (const col of columns) {
    const col_group_id = col.col_group_id ?? -1;
    const group = groupMap.get(col_group_id);
    group.columns.push(col);
  }

  const groupsArray = Array.from(groupMap.values()).filter(
    (g) => g.columns.length > 0
  );

  // Sort the groups by id
  groupsArray.sort((a, b) => {
    if (a.id === -1) return 1; // Ungrouped should come last
    return a.id - b.id;
  });

  return groupsArray;
}