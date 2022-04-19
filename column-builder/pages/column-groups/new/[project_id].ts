import { hyperStyled } from "@macrostrat/hyper";
import pg, {
  usePostgrest,
  BasePage,
  Project,
  ColumnGroupEditor,
  ColumnGroupI,
  CancelButton,
} from "../../../src";
import styles from "../colgroup.module.scss";
import { Spinner } from "@blueprintjs/core";
const h = hyperStyled(styles);

export default function NewColumnGroup({ project_id }: { project_id: number }) {
  const projects: Project[] = usePostgrest(
    pg.from("projects").select().match({ id: project_id })
  );

  if (!projects) return h(Spinner);

  const newColumnGroup: Partial<ColumnGroupI> = {
    col_group: "",
    col_group_long: "",
  };

  const persistChanges = async (
    e: Partial<ColumnGroupI>,
    c: Partial<ColumnGroupI>
  ) => {
    const { data, error } = await pg
      .from("col_groups")
      .insert([{ ...e, project_id: project_id }]);
    if (!error) {
      return data[0];
    } else {
      //catch error
    }
  };

  const project = projects[0];

  return h(BasePage, { query: { project_id } }, [
    h("h3", ["Create a New Column Group for ", project.project]),
    //@ts-ignore
    h(ColumnGroupEditor, { model: newColumnGroup, persistChanges }),
  ]);
}

//@ts-ignore
export async function getServerSideProps(ctx) {
  const {
    query: { project_id },
  } = ctx;

  return { props: { project_id } };
}
