import { hyperStyled } from "@macrostrat/hyper";
import pg, {
  BasePage,
  Project,
  ColumnGroupEditor,
  ColumnGroupI,
  tableSelect,
} from "@macrostrat-web/column-builder";
import styles from "./colgroup.module.scss";
import { GetServerSidePropsContext } from "next";
import { PostgrestError } from "@supabase/postgrest-js";
const h = hyperStyled(styles);

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { project_id },
  } = ctx;

  const { data, error } = await tableSelect("projects", {
    match: { id: project_id },
  });

  const project = data ? data[0] : {};
  const errors = [error].filter((e) => e != null);
  return { props: { project_id, project, errors } };
}

export default function NewColumnGroup(props: {
  project_id: number;
  project: Project;
  errors: PostgrestError[];
}) {
  const { project, project_id, errors } = props;

  const newColumnGroup: Partial<ColumnGroupI> = {
    col_group: "",
    col_group_long: "",
  };

  const persistChanges = async (
    columnGroup: Partial<ColumnGroupI>,
    c: Partial<ColumnGroupI>
  ) => {
    const { data, error } = await pg
      .from("col_groups")
      .insert([{ ...columnGroup, project_id: project_id }]);
    if (!error) {
      return data[0];
    } else {
      //catch error
    }
  };

  return h(BasePage, { query: { project_id }, errors }, [
    h("h3", ["Create a New Column Group for ", project.project]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: newColumnGroup, persistChanges }),
  ]);
}
