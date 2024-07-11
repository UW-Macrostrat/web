import h from "@macrostrat/hyper";
import { Page as ColumnPage } from "~/pages/columns/+Page";
import { usePageProps } from "~/renderer";

export function Page() {
  const { columnGroups, project } = usePageProps();
  return h(ColumnPage, {
    columnGroups,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
  });
}
