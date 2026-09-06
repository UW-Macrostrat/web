/** A project's overview: what it is, how much it holds, and where to go — the
 * columns list filtered to the project, the correlation chart, the column
 * groups. The columns themselves are no longer nested under the project route;
 * the shared project filter on `/columns` takes that role. */
import hyper from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { AnchorButton } from "@blueprintjs/core";
import { DataField, Identifier } from "@macrostrat/data-components";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface ProjectMember {
  id: number;
  name: string;
  slug?: string;
}

interface ProjectDef {
  project_id: number;
  slug?: string;
  project: string;
  descrip?: string;
  timescale_id?: number;
  members?: ProjectMember[] | null;
  t_cols?: number;
  active_cols?: number;
  in_process_cols?: number;
  obsolete_cols?: number;
  t_units?: number;
  area?: number;
}

export function Page() {
  const { project } = useData() as { project: ProjectDef };
  const id = project.project_id;

  return h("div.project-overview", [
    h.if(project.descrip != null)("p.description", project.descrip),
    h(ProjectActions, { project }),
    h(ProjectStats, { project }),
    h(ProjectMembers, { members: project.members }),
  ]);
}

/** Where to go from here. The columns link carries the shared project filter,
 * so the list, its map and the pages reached from it all stay scoped. */
function ProjectActions({ project }: { project: ProjectDef }) {
  const id = project.project_id;
  // Slugs in links where we have them — the forward-looking URL form
  const key = project.slug ?? id;
  let columnsLabel = "Browse columns";
  if (project.active_cols != null) {
    columnsLabel = `Browse ${project.active_cols.toLocaleString()} columns`;
  }
  return h("div.project-actions", [
    h(AnchorButton, {
      intent: "primary",
      icon: "list",
      text: columnsLabel,
      href: `/columns?project_id=${key}`,
    }),
    h(AnchorButton, {
      minimal: true,
      icon: "comparison",
      text: "Correlation chart",
      href: `/columns/correlation#project_id=${key}`,
    }),
    h(AnchorButton, {
      minimal: true,
      icon: "folder-open",
      text: "Column groups",
      href: `/projects/${id}/groups`,
    }),
  ]);
}

function ProjectStats({ project }: { project: ProjectDef }) {
  let area = null;
  if (project.area != null) {
    area = h(DataField, {
      row: true,
      label: "Area",
      value: Math.round(project.area).toLocaleString(),
      unit: "km²",
    });
  }
  return h("div.project-stats", [
    h(CountField, { label: "Columns", value: project.t_cols }),
    h(CountField, { label: "Active", value: project.active_cols }),
    h(CountField, { label: "In process", value: project.in_process_cols }),
    h(CountField, { label: "Obsolete", value: project.obsolete_cols }),
    h(CountField, { label: "Units", value: project.t_units }),
    area,
  ]);
}

function CountField({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return h(DataField, { row: true, label, value: value.toLocaleString() });
}

/** A composite project (e.g. "Core columns") is built from member projects;
 * list them, each linking to its own overview. */
function ProjectMembers({ members }: { members?: ProjectMember[] | null }) {
  if (members == null || members.length === 0) return null;
  return h("div.project-members", [
    h("h3", "Member projects"),
    h(
      "ul",
      members.map((m) =>
        h("li", { key: m.id }, [
          h("a", { href: `/projects/${m.slug ?? m.id}` }, m.name),
          " ",
          h(Identifier, { id: m.id }),
        ])
      )
    ),
  ]);
}
