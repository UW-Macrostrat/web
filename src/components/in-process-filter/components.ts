/** In-process filter UI. Reads the ambient filter from
 * `InProcessFilterProvider`, so a switch anywhere on the page drives the same
 * scope as the list and the maps. */
import h from "@macrostrat/hyper";
import { Switch } from "@blueprintjs/core";
import { Tag, TagSize } from "@macrostrat/data-components";
import { useInProcessFilter, useShowInProcess } from "./state";

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
 * aren't, so the default adds no chrome. */
export function InProcessFilterTag({
  className,
  size = TagSize.Small,
}: {
  className?: string;
  size?: TagSize;
}) {
  const showInProcess = useShowInProcess();
  if (!showInProcess) return null;
  return h(Tag, { className, size, name: "in process", details: "included" });
}
