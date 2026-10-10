/** Pickers for a column's project and group, shared by the overview page and
 * the new-column form. Groups belong to a project, so the group list follows
 * the project chosen. */
import h from "@macrostrat/hyper";
import {
  Button,
  ControlGroup,
  HTMLSelect,
  InputGroup,
} from "@blueprintjs/core";
import { atom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useState } from "react";
import { fetchAPIData } from "~/_utils";

interface ProjectDef {
  project_id: number;
  project: string;
}

export interface GroupDef {
  /** Null for a group that doesn't exist yet: named here, created on write. */
  col_group_id: number | null;
  /** The group's abbreviation */
  col_group: string;
  name: string;
  isNew?: boolean;
}

/** The option that opens the new-group entry. */
const NEW_GROUP = "__new__";

interface Option {
  label: string;
  value: string;
}

const projectsAtom = loadable(
  atom(
    async () =>
      (await fetchAPIData("/defs/projects", { all: true })) as ProjectDef[]
  )
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
  const options = defs.map((d) => ({
    label: d.project,
    value: String(d.project_id),
  }));
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
  allowCreate = false,
  disabled = false,
}: {
  project_id: number | null;
  value: number | null;
  /** The group's name, shown while its project's groups load or if it isn't among them */
  label?: string | null;
  onChange: (group: GroupDef | null) => void;
  /** Offer a "New group…" choice: the name is entered here and the group is
   * created when the column is written. */
  allowCreate?: boolean;
  disabled?: boolean;
}) {
  const groups = useAtomValue(groupsAtomFor(project_id));
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState("");
  let defs: GroupDef[] = [];
  if (groups.state === "hasData") defs = groups.data;

  const options = defs.map((d) => ({
    label: d.name,
    value: String(d.col_group_id),
  }));
  // A group named but not yet created has no id; it shows under its name.
  const pendingNew = value == null && label != null && label !== "";
  let selected = idToValue(value);
  if (pendingNew) {
    selected = NEW_GROUP;
    options.unshift({ label: `${label} (new)`, value: NEW_GROUP });
  } else if (selected !== "" && !options.some((d) => d.value === selected)) {
    options.unshift({ label: label ?? `Group ${value}`, value: selected });
  }
  if (allowCreate && !pendingNew)
    options.push({ label: "New group…", value: NEW_GROUP });

  let emptyLabel = "No group";
  if (project_id == null) emptyLabel = "Choose a project first";

  const select = h(LookupSelect, {
    loading: groups.state === "loading",
    disabled: disabled || project_id == null,
    options,
    value: selected,
    emptyLabel,
    onChange: (v: string) => {
      if (v === NEW_GROUP) {
        setNaming(true);
        return;
      }
      setNaming(false);
      const group = defs.find((d) => String(d.col_group_id) === v) ?? null;
      onChange(group);
    },
  });

  if (!naming) return select;

  const commit = () => {
    const name = newName.trim();
    if (name === "") return;
    onChange({ col_group_id: null, col_group: name, name, isNew: true });
    setNaming(false);
    setNewName("");
  };

  return h(ControlGroup, { vertical: true }, [
    select,
    h(ControlGroup, [
      h(InputGroup, {
        autoFocus: true,
        placeholder: "Name for the new group",
        value: newName,
        onValueChange: setNewName,
        onKeyDown(evt) {
          if (evt.key === "Enter") commit();
          if (evt.key === "Escape") setNaming(false);
        },
      }),
      h(Button, {
        icon: "add",
        text: "Add",
        disabled: newName.trim() === "",
        onClick: commit,
      }),
      h(Button, {
        minimal: true,
        text: "Cancel",
        onClick: () => setNaming(false),
      }),
    ]),
  ]);
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
