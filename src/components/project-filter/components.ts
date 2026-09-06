/** Project filter UI: one tag per selected project, and a prominent dropdown
 * to pick projects (several at once). Both read the ambient filter from
 * `ProjectFilterProvider`. */
import { hyperStyled } from "@macrostrat/hyper";
import { useMemo } from "react";
import { Button, Menu, MenuDivider, MenuItem, PopoverNext } from "@blueprintjs/core";
import { Tag, TagSize } from "@macrostrat/data-components";
import {
  findProject,
  projectSlug,
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
 * serves when no project is asked for. */
export function ProjectFilterControl({ className }: { className?: string }) {
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
          small: true,
          active: isOpen,
          icon: "projects",
          rightIcon: "caret-down",
          title: "Projects whose columns are shown",
        },
        // A fixed label: the selection itself shows as tags elsewhere
        "Projects"
      ),
  });
}
