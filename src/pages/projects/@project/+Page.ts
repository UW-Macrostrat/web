import h from "@macrostrat/hyper";
import { Page as ColumnPage } from "~/pages/columns/+Page";

export function Page({ columnGroups, project }) {
  return h(ColumnPage, {
    columnGroups,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
  });
}
