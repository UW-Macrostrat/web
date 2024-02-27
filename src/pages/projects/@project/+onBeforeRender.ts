import { apiV2Prefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";

const apiAddress = apiV2Prefix + "/defs/columns";

export type ColumnGroup = {
  id: number;
  name: string;
  columns: Array<any>;
};

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const project_id = pageContext.routeParams.project;

  const res0 = await fetch(
    apiV2Prefix + `/defs/projects?project_id=${project_id}&in_process=true`
  );
  const res1 = await res0.json();
  const project = res1.success.data[0];

  const columnGroups = await getGroupedColumns(project_id);

  return {
    pageContext: {
      pageProps: { columnGroups, project },
    },
  };
}

export async function getGroupedColumns(project_id) {
  const response = await fetch(apiAddress + "?project_id=" + project_id);
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
  return columnGroups;
}
