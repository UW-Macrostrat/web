import h from "@macrostrat/hyper";
import { GetServerSidePropsContext } from "next";
import pg, {
  tableSelect,
  Row,
  Project,
  BasePage,
  Table,
  EditButton,
  CreateButton,
} from "../src";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const { data, error } = await tableSelect("projects");
  const projects: Project[] = data ? data : [{}];

  return { props: { projects } };
}

function Projects({ projects }: { projects: Project[] }) {
  const headers = Object.keys(projects[0]);

  return h(BasePage, { query: {} }, [
    h("h3,", [
      "Choose a Project",
      h(CreateButton, {
        minimal: true,
        href: "/project/new",
        text: "Create New Project",
      }),
    ]),
    h(Table, { interactive: true }, [
      h("thead", [
        h("tr", [
          headers.map((head, i) => {
            return h("th", { key: i }, [head]);
          }),
        ]),
      ]),
      h("tbody", [
        projects.map((project, i) => {
          return h(Row, { key: i, href: `/column-groups/${project.id}` }, [
            h("td", [project.id]),
            h("td", [project.project]),
            h("td", [project.descrip]),
            h("td", [project.timescale_id]),
            h("td", [
              h(EditButton, {
                href: `/project/${project.id}/edit`,
              }),
            ]),
          ]);
        }),
      ]),
    ]),
  ]);
}

export default Projects;
