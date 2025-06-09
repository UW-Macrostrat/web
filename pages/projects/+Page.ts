import h from "./main.module.scss";
import { ContentPage } from "~/layouts";
import { PageHeader, LinkCard } from "~/components";
import { useData } from "vike-react/useData";
import { Footer, Image } from "~/components/general";

export function Page() {
  // static list of projects with pictures
  const pictures = {
    1: "north_america_med.jpg",
    4: "deep_sea_new_medium.jpg",
    5: "new_zealand_new_medium.jpg",
    7: "caribbean_new_medium.jpg",
  };

  const { projects } = useData();

  return h("div", [
    h(ContentPage, [
      h(PageHeader, { title: "Projects" }),
      projects.map((d) =>
        h(ProjectItem, { data: d, key: d.project_id, pictures })
      ),
    ]),
    h(Footer),
  ]);
}

function ProjectItem({ data, pictures }) {
  // check if has picture
  const hasPicture = pictures[data.project_id] != null;

  const { project_id, project, descrip } = data;
  const href = `/projects/${project_id}`;
  return h(
    LinkCard,
    { href, title: project },
    h("div.project", [
      h("div.project-body", [
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
      ]),
      hasPicture ? h(Image, { src: pictures[data.project_id] }) : null,
    ])
  );
}

function KeyValue({ name, value }) {
  return h("span.key-value", [
    h("span.key", name),
    ": ",
    h("span.value", value),
  ]);
}
