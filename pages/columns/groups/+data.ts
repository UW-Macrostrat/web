import { fetchAPIData } from "~/_utils/fetch-helpers";

export async function data() {
  const res = await fetchAPIData(`/columns`,{ all: true });

    const grouped = {};

    for (const item of res) {
      const key = item.col_group_id;

      if (!grouped[key]) {
        grouped[key] = {
          name: item.col_group,
          id: item.col_group_id,
          columns: []
        };
      }

      grouped[key].columns.push(item);
    }

    const columnGroups = Object.values(grouped);



  return {
    columnGroups,
  };
}
