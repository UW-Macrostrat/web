/** Project filter UI: a clearable tag naming the selected project, and a
 * select for the settings panel. Both read the ambient filter from
 * `ProjectFilterProvider`. */
import { hyperStyled } from "@macrostrat/hyper";
import { useMemo } from "react";
import { Button, FormGroup, HTMLSelect } from "@blueprintjs/core";
import { Tag, TagSize } from "@macrostrat/data-components";
import { useProjectDef, useProjectDefs, useProjectFilter } from "./state";
import styles from "./main.module.sass";

const h = hyperStyled(styles);

export interface ProjectFilterTagProps {
  className?: string;
  size?: TagSize;
  clearable?: boolean;
}

/** The selected project as a tag; nothing when every project is shown. */
export function ProjectFilterTag(props: ProjectFilterTagProps) {
  const { className, size = TagSize.Small, clearable = true } = props;
  const { projectID, clear } = useProjectFilter();
  const def = useProjectDef(projectID);
  if (projectID == null) return null;

  return h("span.project-filter-tag", { className }, [
    h(Tag, {
      size,
      name: def?.project ?? `Project ${projectID}`,
      details: "project",
    }),
    h.if(clearable)(Button, {
      className: "clear-button",
      icon: "cross",
      minimal: true,
      small: true,
      title: "Show all projects",
      onClick: clear,
    }),
  ]);
}

const ALL_PROJECTS = "";

/** Settings-panel control: pick the project whose columns are shown. */
export function ProjectFilterControl({ className }: { className?: string }) {
  const { projectID, setProjectID } = useProjectFilter();
  const defs = useProjectDefs();

  const options = useMemo(() => {
    const projects = [...(defs ?? [])]
      .filter((d) => (d.t_cols ?? 1) > 0)
      .sort((a, b) => a.project.localeCompare(b.project))
      .map((d) => ({ label: d.project, value: d.project_id.toString() }));
    return [{ label: "All projects", value: ALL_PROJECTS }, ...projects];
  }, [defs]);

  return h(
    FormGroup,
    { label: "Project", inline: true, className: "project-filter-control" },
    h(HTMLSelect, {
      options,
      value: projectID?.toString() ?? ALL_PROJECTS,
      onChange(evt) {
        const value = evt.currentTarget.value;
        if (value === ALL_PROJECTS) {
          setProjectID(null);
        } else {
          setProjectID(parseInt(value, 10));
        }
      },
    })
  );
}
