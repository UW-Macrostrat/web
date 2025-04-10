import h from "@macrostrat/hyper";
import { PostgrestError } from "@supabase/postgrest-js";
import { useData } from "vike-react/useData";
import pg, {
  ColumnGroupI,
  Row,
  BasePage,
  Table,
  CreateButton,
  EditButton,
} from "@macrostrat-web/column-builder";
import type { ColumnGroupsData } from "./+data";

export function Page() {
  const props = useData<ColumnGroupsData>();

  const { project_id, errors } = props;

  const headers = ["ID", "Name", "Col #", "Status"];

  return h(BasePage, { query: { project_id }, errors }, [
    h("h3", [
      `Column Groups for Project #${props.project_id}: ${props.projectName}`,
      h(CreateButton, {
        href: `/column-groups/${project_id}/new`,
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
                href: `../column-group/${colGroup.id}/edit`,
              }),
            ]),
            h(Table, { interactive: true, headers }, [
              colGroup.cols.map((id, i) => {
                return h(
                  Row,
                  {
                    key: id.col_id,
                    href: `../column/${id.col_id}`,
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
            h(CreateButton, {
              href: `/column-group/${colGroup.id}/new-column`,
              text: "Add New Column",
            }),
          ]
        );
      }),
    ]),
  ]);
}
