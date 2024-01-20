import fetch from "node-fetch";
import { apiV2Prefix } from "~/settings";

const apiAddress = apiV2Prefix + "/columns";

type ColumnGroup = {
  id: number;
  name: string;
  columns: Array<any>;
};

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(apiAddress + "?project_id=1");
  const res = await response.json();
  let columns = res.success.data;
  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group

  const columnGroupIx: { [ix: number]: ColumnGroup } = columns.reduce(
    (acc, d) => {
      const { col_group_id, col_group } = d;
      acc[col_group] ??= {
        id: col_group_id,
        name: col_group,
        columns: [],
      };
      acc[col_group].columns.push(d);
      return acc;
    },
    {}
  );

  const columnGroups = Object.values(columnGroupIx);
  columnGroups.sort((a, b) => a.id - b.id);

  const pageProps = { columnGroups };
  return {
    pageContext: {
      pageProps,
    },
  };
}
