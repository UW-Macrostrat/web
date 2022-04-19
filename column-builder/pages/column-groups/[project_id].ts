import h from "@macrostrat/hyper";
import { GetServerSidePropsContext } from "next";
import {
  Project,
  ColumnGroupI,
  Row,
  BasePage,
  Table,
  CreateButton,
  EditButton,
  useTableSelect,
} from "../../src";

export default function ColumnGroup({ project_id }: { project_id: number }) {
  const projects: Project[] = useTableSelect({
    tableName: "projects",
    match: { id: project_id },
    limit: 1,
  });

  const columnGroups: ColumnGroupI[] = useTableSelect({
    tableName: "col_group_view",
    match: { project_id: project_id },
  });

  if (!columnGroups || !projects) return h("div");
  const project = projects[0];

  return h(BasePage, { query: { project_id } }, [
    h("h3", [
      project.project,
      h(CreateButton, {
        href: `/column-groups/new/${project_id}`,
        text: "Add New Group",
      }),
    ]),
    h("div", { style: { display: "flex", flexWrap: "wrap" } }, [
      columnGroups.map((colGroup, i) => {
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

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const {
    query: { project_id },
  } = ctx;

  return { props: { project_id } };
}
