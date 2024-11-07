import {
  tableInsert,
  BasePage,
  Project,
  ProjectEditor,
} from "@macrostrat-web/column-builder";
import h from "../project.module.scss";

export function Page() {
  const newProject: Project = {
    project: "",
    descrip: "",
    timescale_id: undefined,
  };

  const persistChanges = async (project: Project, c: Partial<Project>) => {
    const { data, error } = await tableInsert("projects", project);
    return data ? data[0] : {};
  };

  return h(BasePage, { query: {}, errors: [] }, [
    h("h3", ["Create a New Project"]),
    //@ts-ignore
    h(ProjectEditor, { project: newProject, persistChanges }),
  ]);
}
