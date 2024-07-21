import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, LinkCard } from "~/components";
import { usePageProps } from "~/renderer/usePageProps";

export function Page() {
  const { projects } = usePageProps();
  return h(ContentPage, [
    h(PageHeader, { title: "Projects" }),
    projects.map((d) => h(ProjectItem, { data: d, key: d.project_id })),
  ]);
}

function ProjectItem({ data }) {
  const { project_id, project, descrip } = data;
  const href = `/projects/${project_id}`;
  return h(LinkCard, { href, title: project }, [
    h("p", descrip),
    h("p.col_stats", [
      h(KeyValue, { name: "Columns", value: data.t_cols }),
      ", ",
      h(KeyValue, { name: "in process", value: data.in_proccess_cols }),
      ", ",
      h(KeyValue, { name: "obsolete", value: data.obsolete_cols }),
      "; ",
      h(KeyValue, { name: "Units", value: data.t_units }),
    ]),
  ]);
}

function KeyValue({ name, value }) {
  return h("span.key-value", [
    h("span.key", name),
    ": ",
    h("span.value", value),
  ]);
}
