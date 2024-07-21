import { fetchAPIData, getGroupedColumns } from "~/pages/columns/utils";

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const project_id = pageContext.routeParams.project;

  const projects = await fetchAPIData(`/defs/projects`, {
    project_id,
    in_process: true,
  });
  const project = projects[0];

  const columnGroups = await getGroupedColumns(project_id);

  return {
    pageContext: {
      pageProps: { columnGroups, project },
    },
  };
}
