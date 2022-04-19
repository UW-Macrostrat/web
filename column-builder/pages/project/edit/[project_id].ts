import { hyperStyled } from "@macrostrat/hyper";
import {
  useTableSelect,
  tableUpdate,
  BasePage,
  Project,
  ProjectEditor,
} from "../../../src";
import styles from "../project.module.scss";
import { Spinner } from "@blueprintjs/core";
import { GetServerSidePropsContext } from "next";
const h = hyperStyled(styles);

export default function NewProject({ project_id }: { project_id: string }) {
  const project: Project = useTableSelect({
    tableName: "projects",
    match: parseInt(project_id),
    limit: 1,
  });

  if (!project) return h(Spinner);

  const persistChanges = async (e: Project, changes: Partial<Project>) => {
    const { data, error } = await tableUpdate({
      tableName: "projects",
      id: e.id,
      changes,
    });

    if (!error) {
      return data[0];
    } else {
      // error catching here
    }
  };

  return h(BasePage, { query: {} }, [
    h("h3", ["Create a New Project"]),
    //@ts-ignore
    h(ProjectEditor, { project: project[0], persistChanges }),
  ]);
}

export async function getServerSideProps({
  query,
  ...rest
}: GetServerSidePropsContext) {
  const { project_id } = query;

  return { props: { project_id } };
}
