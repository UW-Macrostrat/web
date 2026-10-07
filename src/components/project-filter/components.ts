/** Project filter UI: one tag per selected project, and a prominent dropdown
 * to pick projects (several at once). Both read the ambient filter from
 * `ProjectFilterProvider`. */
import { hyperStyled } from "@macrostrat/hyper";
import { useMemo } from "react";
import {
  AnchorButton,
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  PopoverNext,
} from "@blueprintjs/core";
import { Tag, TagSize } from "@macrostrat/data-components";
import { CORE_COLUMNS_PROJECT_ID } from "@macrostrat/data-provider";
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

/** Every project as a checkable menu; pick one or several. The first entry
 * returns to the default, the "Core columns" composite, which is what the API
 * serves when no project is asked for. `inline` keeps an enclosing popover open
 * on every pick, for a menu embedded in another panel. */
export function ProjectFilterMenu({ inline = false }: { inline?: boolean }) {
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

  let coreIcon = "blank";
  if (projects.length === 0) {
    coreIcon = "tick";
  }

  return h(Menu, { className: "project-menu" }, [
    h(MenuItem, {
      icon: coreIcon,
      text: "Core columns",
      label: "default",
      shouldDismissPopover: !inline,
      onClick: clear,
    }),
    h(MenuDivider, { title: h(ProjectsDividerTitle) }),
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
}

/** The divider's title, with a way out to the project pages. */
function ProjectsDividerTitle() {
  return h("span.projects-divider-title", [
    "Projects",
    h(AnchorButton, {
      href: "/projects",
      icon: "share",
      minimal: true,
      small: true,
      title: "Browse projects",
      className: "browse-projects-button",
    }),
  ]);
}

/** The project menu behind a dropdown button. With `showSelection`, the button
 * names the selection; otherwise it is a fixed label and tags show it. */
export function ProjectFilterControl({
  className,
  showSelection = false,
  large = false,
}: {
  className?: string;
  showSelection?: boolean;
  large?: boolean;
}) {
  const { projects } = useProjectFilter();
  const defs = useProjectDefs();

  let label: any = "Projects";
  if (showSelection) {
    label = projectSelectionLabel(defs, projects);
  }

  let size = "small";
  if (large) {
    size = "large";
  }

  return h(PopoverNext, {
    className,
    minimal: true,
    placement: "bottom-start",
    content: h(ProjectFilterMenu),
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

/** One project by name; several by count. */
function projectSelectionLabel(
  defs: ProjectDef[] | null,
  projects: string[]
): string {
  if (projects.length > 1) return `${projects.length} projects`;
  if (projects.length === 1) {
    return findProject(defs, projects[0])?.project ?? projects[0];
  }
  return findProject(defs, CORE_COLUMNS_PROJECT_ID)?.project ?? "Core columns";
}
