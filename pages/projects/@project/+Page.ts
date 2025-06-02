import h from "@macrostrat/hyper";
import { Page as ColumnListPage } from "#/columns/+Page.ts";
import { useData } from "vike-react/useData";

export function Page() {
  const { columnGroups, project } = useData();
  return h(ColumnListPage, {
    columnGroups,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
  });
}
