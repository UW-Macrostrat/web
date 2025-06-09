import h from "@macrostrat/hyper";
import { Page as ColumnListPage } from "#/columns/+Page.ts";
import { useData } from "vike-react/useData";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";

export function Page() {
  const { columnGroups, project } = useData();
  const url = apiV2Prefix + `/columns?project_id=${project.project_id}`;
  const columnRes = useAPIResult(url)?.success?.data;
  console.log("columnres", columnRes);

  return h(ColumnListPage, {
    project: project,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
    columnRes,
  });
}
