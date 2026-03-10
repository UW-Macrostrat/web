import { fetchAPIData, fetchProjectData } from "~/_utils/fetch-helpers.ts";

export async function data(pageContext) {
  const { project } = pageContext.routeParams;

  const res = await fetchAPIData("/defs/groups", { project_id: project });

  const projectData = await fetchProjectData(project);

  //const res = await fetchAPIData(`/columns`, { all: true });

  // const grouped = {};
  //
  // for (const item of res) {
  //   const key = item.col_group_id;
  //
  //   if (!grouped[key]) {
  //     grouped[key] = {
  //       name: item.col_group,
  //       id: item.col_group_id,
  //       columns: [],
  //     };
  //   }
  //
  //   grouped[key].columns.push(item);
  // }
  //
  // const columnGroups = Object.values(grouped);

  return {
    project: projectData,
    columnGroups: res,
  };
}
