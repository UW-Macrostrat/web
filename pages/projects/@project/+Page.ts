import h from "@macrostrat/hyper";
import { ColumnPage } from "#/columns/+Page";
import { useData } from "vike-react/useData";

export function Page() {
  const { columnGroups, project } = useData();
  return h(ColumnPage, {
    columnGroups,
    title: project.project,
    linkPrefix: `/projects/${project.project_id}/`,
  });
}
