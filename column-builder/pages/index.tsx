import h from "@macrostrat/hyper";
import { PostgrestError } from "@supabase/postgrest-js";
import { GetServerSidePropsContext } from "next";
import Head from "next/head";
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

  const errors = [error].filter((e) => e != null);
  return { props: { projects, errors } };
}

function Projects({
  projects,
  errors,
}: {
  projects: Project[];
  errors: PostgrestError[];
}) {
  const headers = Object.keys(projects[0]);

  return h(BasePage, { query: {}, errors }, [
    h(Head, [h("title", ["Column-Builder"])]),
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

export default Projects;
