import { hyperStyled } from "@macrostrat/hyper";
import { tableInsert, BasePage, Project, ProjectEditor } from "../../src";
import styles from "./project.module.scss";
const h = hyperStyled(styles);

export default function NewProject() {
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
