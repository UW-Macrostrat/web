import {
  BasePage,
  Project,
  ProjectEditor,
  tableUpdate,
} from "@macrostrat-web/column-builder";
import h from "../../project.module.scss";
import { useData } from "vike-react/useData";
import type { ProjectData } from "./+data";

export function Page() {
  const { project, project_id, errors } = useData<ProjectData>();

  const persistChanges = async (e: Project, changes: Partial<Project>) => {
    const { data, error } = await tableUpdate("projects", {
      id: e.id,
      changes,
    });

    if (!error) {
      return data[0];
    } else {
      // error catching here
    }
  };

  return h(BasePage, { query: {}, errors }, [
    h("h3", ["Create a New Project"]),
    h(ProjectEditor, { project: project, persistChanges }),
  ]);
}
