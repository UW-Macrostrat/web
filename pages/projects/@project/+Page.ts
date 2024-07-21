import h from "@macrostrat/hyper";
import { Page as ColumnPage } from "#/columns/+Page";
import { usePageProps } from "~/renderer/usePageProps";

export function Page() {
  const { columnGroups, project } = usePageProps();
  return h(ColumnPage, {
    columnGroups,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
  });
}
