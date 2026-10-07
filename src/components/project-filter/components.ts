/** Project filter UI: one tag per selected project, and a prominent dropdown
 * to pick projects (several at once). Both read the ambient filter from
 * `ProjectFilterProvider`. */
import { hyperStyled } from "@macrostrat/hyper";
import { useMemo } from "react";
import { Button, Menu, MenuDivider, MenuItem, PopoverNext } from "@blueprintjs/core";
import { Identifier, Tag, TagSize } from "@macrostrat/data-components";
import { CORE_COLUMNS_PROJECT_ID } from "@macrostrat/data-provider";
import {
  findProject,
  projectSlug,
  resolveProjectIDs,
  useProjectDefs,
  useProjectFilter,
  type ProjectDef,
} from "./state";
import styles from "./main.module.sass";

const h = hyperStyled(styles);

export interface ProjectFilterTagProps {
  className?: string;
  size?: TagSize;
  clearable?: boolean;
}

/** The selected projects as tags; nothing when the default (core columns)
 * applies. Each tag's × removes just that project. */
export function ProjectFilterTag(props: ProjectFilterTagProps) {
  const { className, size = TagSize.Small, clearable = true } = props;
  const { projects, removeProject } = useProjectFilter();
  const defs = useProjectDefs();
  if (projects.length === 0) return null;

  return h(
    "span.project-filter-tags",
    { className },
    projects.map((slug) => {
      const def = findProject(defs, slug);
      return h("span.project-filter-tag", { key: slug }, [
        h(Tag, { size, name: def?.project ?? slug, details: "project" }),
        h.if(clearable)(Button, {
          className: "clear-button",
          icon: "cross",
          minimal: true,
          small: true,
          title: `Remove ${def?.project ?? slug}`,
          onClick: () => removeProject(slug),
        }),
      ]);
    })
  );
}

/** A dropdown listing every project; pick one or several. The first entry
 * returns to the default, the "Core columns" composite, which is what the API
 * serves when no project is asked for. With `showSelection`, the button names
 * the selection; otherwise it is a fixed label and tags show the selection. */
export function ProjectFilterControl({
  className,
  showSelection = false,
  large = false,
}: {
  className?: string;
  showSelection?: boolean;
  large?: boolean;
}) {
  const { projects, toggleProject, clear } = useProjectFilter();
  const defs = useProjectDefs();

  const sorted = useMemo(() => {
    return [...(defs ?? [])]
      .filter((d) => (d.t_cols ?? 1) > 0)
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [defs]);

  const isSelected = (def: ProjectDef) => {
    const slug = projectSlug(def);
    return projects.includes(slug) || projects.includes(def.project_id.toString());
  };

  const menu = h(Menu, { className: "project-menu" }, [
    h(MenuItem, {
      icon: projects.length === 0 ? "tick" : "blank",
      text: "Core columns",
      label: "default",
      onClick: clear,
    }),
    h(MenuDivider, { title: "Projects" }),
    ...sorted.map((def) =>
      h(MenuItem, {
        key: def.project_id,
        icon: isSelected(def) ? "tick" : "blank",
        text: def.project,
        label: def.active_cols?.toLocaleString(),
        shouldDismissPopover: false,
        onClick: () => toggleProject(projectSlug(def)),
      })
    ),
  ]);

  let label: any = "Projects";
  if (showSelection) {
    label = h(ProjectSelectionLabel, { defs, projects });
  }

  let size = "small";
  if (large) {
    size = "large";
  }

  return h(PopoverNext, {
    className,
    minimal: true,
    placement: "bottom-start",
    content: menu,
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(
        Button,
        {
          ...targetProps,
          minimal: true,
          size,
          active: isOpen,
          icon: "projects",
          rightIcon: "caret-down",
          title: "Projects whose columns are shown",
        },
        label
      ),
  });
}

/** One project by name and ID; several by count and IDs. */
function ProjectSelectionLabel({
  defs,
  projects,
}: {
  defs: ProjectDef[] | null;
  projects: string[];
}) {
  if (projects.length > 1) {
    const ids = resolveProjectIDs(defs, projects) ?? [];
    return h("span.selection-label", [
      h("span.selection-name", `${projects.length} projects`),
      h("span.selection-id", h(Identifier, { id: ids.join(", ") })),
    ]);
  }

  let def = findProject(defs, CORE_COLUMNS_PROJECT_ID);
  let name = def?.project ?? "Core columns";
  if (projects.length === 1) {
    def = findProject(defs, projects[0]);
    name = def?.project ?? projects[0];
  }

  let identifier = null;
  if (def != null) {
    identifier = h("span.selection-id", h(Identifier, { id: def.project_id }));
  }
  return h("span.selection-label", [
    h("span.selection-name", name),
    identifier,
  ]);
}
