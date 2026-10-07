/** Pickers for a column's project and group, shared by the overview page and
 * the new-column form. Groups belong to a project, so the group list follows
 * the project chosen. */
import h from "@macrostrat/hyper";
import { HTMLSelect } from "@blueprintjs/core";
import { atom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { fetchAPIData } from "~/_utils";

interface ProjectDef {
  project_id: number;
  project: string;
}

export interface GroupDef {
  col_group_id: number;
  /** The group's abbreviation */
  col_group: string;
  name: string;
}

interface Option {
  label: string;
  value: string;
}

const projectsAtom = loadable(
  atom(async () => (await fetchAPIData("/defs/projects", { all: true })) as ProjectDef[])
);

function makeGroupsAtom(project_id: number | null) {
  return loadable(
    atom(async () => {
      if (project_id == null) return [] as GroupDef[];
      return (await fetchAPIData("/defs/groups", { project_id })) as GroupDef[];
    })
  );
}

// One atom per project, so each project's groups are fetched once
const groupAtoms = new Map<number | null, ReturnType<typeof makeGroupsAtom>>();

function groupsAtomFor(project_id: number | null) {
  let groupsAtom = groupAtoms.get(project_id);
  if (groupsAtom == null) {
    groupsAtom = makeGroupsAtom(project_id);
    groupAtoms.set(project_id, groupsAtom);
  }
  return groupsAtom;
}

function idToValue(id: number | null): string {
  if (id == null) return "";
  return String(id);
}

export function ProjectSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (project_id: number | null) => void;
}) {
  const projects = useAtomValue(projectsAtom);
  let defs: ProjectDef[] = [];
  if (projects.state === "hasData") defs = projects.data;
  const options = defs.map((d) => ({ label: d.project, value: String(d.project_id) }));
  const selected = idToValue(value);
  if (selected !== "" && !options.some((d) => d.value === selected)) {
    options.unshift({ label: `Project ${value}`, value: selected });
  }
  return h(LookupSelect, {
    loading: projects.state === "loading",
    options,
    value: selected,
    emptyLabel: "No project",
    onChange: (v: string) => {
      let project_id: number | null = null;
      if (v !== "") project_id = Number(v);
      onChange(project_id);
    },
  });
}

export function GroupSelect({
  project_id,
  value,
  label,
  onChange,
}: {
  project_id: number | null;
  value: number | null;
  /** The group's name, shown while its project's groups load or if it isn't among them */
  label?: string | null;
  onChange: (group: GroupDef | null) => void;
}) {
  const groups = useAtomValue(groupsAtomFor(project_id));
  let defs: GroupDef[] = [];
  if (groups.state === "hasData") defs = groups.data;

  const options = defs.map((d) => ({ label: d.name, value: String(d.col_group_id) }));
  const selected = idToValue(value);
  if (selected !== "" && !options.some((d) => d.value === selected)) {
    options.unshift({ label: label ?? `Group ${value}`, value: selected });
  }

  let emptyLabel = "No group";
  if (project_id == null) emptyLabel = "Choose a project first";

  return h(LookupSelect, {
    loading: groups.state === "loading",
    disabled: project_id == null,
    options,
    value: selected,
    emptyLabel,
    onChange: (v: string) => {
      const group = defs.find((d) => String(d.col_group_id) === v) ?? null;
      onChange(group);
    },
  });
}

function LookupSelect({
  loading,
  disabled = false,
  options,
  value,
  emptyLabel,
  onChange,
}: {
  loading: boolean;
  disabled?: boolean;
  options: Option[];
  value: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  let first = emptyLabel;
  if (loading) first = "Loading…";
  return h(HTMLSelect, {
    value,
    disabled: disabled || loading,
    options: [{ label: first, value: "" }, ...options],
    onChange: (evt: any) => onChange(evt.currentTarget.value),
  });
}
