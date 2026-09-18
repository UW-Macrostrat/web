/** In-process filter UI. Reads the ambient filter from
 * `InProcessFilterProvider`, so a switch anywhere on the page drives the same
 * scope as the list and the maps. */
import { hyperStyled } from "@macrostrat/hyper";
import { Button, Switch } from "@blueprintjs/core";
import { Tag, TagSize } from "@macrostrat/data-components";
import { useInProcessFilter } from "./state";
import styles from "./main.module.sass";

const h = hyperStyled(styles);

export interface InProcessSwitchProps {
  className?: string;
  label?: string;
}

export function InProcessSwitch({
  className,
  label = "Show in-process columns",
}: InProcessSwitchProps) {
  const [showInProcess, setShowInProcess] = useInProcessFilter();
  return h(Switch, {
    className,
    checked: showInProcess,
    label,
    onChange: () => setShowInProcess(!showInProcess),
  });
}

/** A tag marking that unfinished columns are in scope; nothing when they
 * aren't, so the default adds no chrome. Its × turns the filter back off, the
 * way a project tag's × drops that project. */
export function InProcessFilterTag({
  className,
  size = TagSize.Small,
  clearable = true,
}: {
  className?: string;
  size?: TagSize;
  clearable?: boolean;
}) {
  const [showInProcess, setShowInProcess] = useInProcessFilter();
  if (!showInProcess) return null;
  return h("span.in-process-filter-tag", { className }, [
    h(Tag, { size, name: "in process" }),
    h.if(clearable)(Button, {
      className: "clear-button",
      icon: "cross",
      minimal: true,
      small: true,
      title: "Hide in-process columns",
      onClick: () => setShowInProcess(false),
    }),
  ]);
}
