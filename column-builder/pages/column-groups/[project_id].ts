import h from "@macrostrat/hyper";
import { GetServerSidePropsContext } from "next";
import pg, {
  ColumnGroupI,
  Row,
  BasePage,
  Table,
  CreateButton,
  EditButton,
} from "../../src";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { project_id },
  } = ctx;
  const { data, error } = await pg
    .from("col_group_view")
    .select("*, project_id(project)")
    .match({ project_id: project_id });

  const projectName: string = data ? data[0].project_id.project : "";

  return { props: { project_id, projectName, columnGroups: data } };
}

export default function ColumnGroup(props: {
  projectName: string;
  project_id: number;
  columnGroups: ColumnGroupI[];
}) {
  const { project_id } = props;

  return h(BasePage, { query: { project_id } }, [
    h("h3", [
      props.projectName,
      h(CreateButton, {
        href: `/column-groups/new/${project_id}`,
        text: "Add New Group",
      }),
    ]),
    h("div", { style: { display: "flex", flexWrap: "wrap" } }, [
      props.columnGroups.map((colGroup, i) => {
        return h(
          "div",
          { key: i, style: { textAlign: "center", height: "100%" } },
          [
            h("div.col-group-name", [
              h("h3", { style: { margin: 0 } }, colGroup.col_group_long),
              h(EditButton, {
                small: true,
                href: `/column-groups/edit/${colGroup.id}`,
              }),
            ]),
            h(Table, { interactive: true }, [
              h("thead", [
                h("tr", [
                  h("td", "ID"),
                  h("td", "Name"),
                  h("td", "Col #"),
                  h("td", "Status"),
                ]),
              ]),
              h("tbody", [
                colGroup.cols.map((id, i) => {
                  return h(
                    Row,
                    {
                      key: i,
                      href: `/column/${id.col_id}`,
                    },
                    [
                      h("td", [id.col_id]),
                      h("td", [id.col_name]),
                      h("td", [id.col_number]),
                      h("td", [id.status_code]),
                    ]
                  );
                }),
              ]),
            ]),
            h(CreateButton, {
              href: `/column/new/${colGroup.id}`,
              text: "Add New Column",
            }),
          ]
        );
      }),
    ]),
  ]);
}
