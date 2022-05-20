import { hyperStyled } from "@macrostrat/hyper";
import {
  tableUpdate,
  BasePage,
  Project,
  ProjectEditor,
  selectFirst,
} from "../../../src";
import styles from "../project.module.scss";
import { GetServerSidePropsContext } from "next";
import { PostgrestError } from "@supabase/postgrest-js";
const h = hyperStyled(styles);

export async function getServerSideProps({
  query,
  ...rest
}: GetServerSidePropsContext) {
  const { project_id } = query;

  const { firstData, error } = await selectFirst("projects", {
    match: { id: project_id },
  });
  const project = firstData ? firstData : {};
  const errors = [error].filter((e) => e != null);
  return { props: { project_id, project, errors } };
}

export default function NewProject(props: {
  project_id: string;
  project: Project;
  errors: PostgrestError[];
}) {
  const { project, project_id, errors } = props;

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
    //@ts-ignore
    h(ProjectEditor, { project: project, persistChanges }),
  ]);
}
