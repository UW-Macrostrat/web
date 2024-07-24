import h from "@macrostrat/hyper";
import { PostgrestError } from "@supabase/postgrest-js";
import {
  Row,
  Project,
  BasePage,
  Table,
  EditButton,
  CreateButton,
} from "@macrostrat-web/column-builder";
import { useData } from "vike-react/useData";

export function Page() {
  const data = useData();
  const {
    projects,
    errors,
  }: {
    projects: Project[];
    errors: PostgrestError[];
  } = data;

  const headers = Object.keys(projects[0]);

  return h(BasePage, { query: {}, errors }, [
    h("h3,", [
      "Choose a Project",
      h(CreateButton, {
        minimal: true,
        href: "/project/new",
        text: "Create New Project",
      }),
    ]),
    h(Table, { interactive: true, headers }, [
      projects.map((project, i) => {
        return h(
          Row,
          {
            key: i,
            href: `/column-groups/${project.id}`,
          },
          [
            h("td", [project.id]),
            h("td", [project.project]),
            h("td", [project.descrip]),
            h("td", [project.timescale_id]),
            h("td", [
              h(EditButton, {
                href: `/project/${project.id}/edit`,
              }),
            ]),
          ]
        );
      }),
    ]),
  ]);
}
