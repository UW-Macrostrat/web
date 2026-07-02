import hyper from "@macrostrat/hyper";
import { Button, Callout, Collapse, IconName, Intent } from "@blueprintjs/core";
import styles from "./expandable-panel.module.scss";

const h = hyper.styled(styles);

interface ExpandablePanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  title: string;
  icon?: IconName;
  /** Colors both the header button and the Callout body: "warning" = orange,
   * the default "none" = light grey, etc. */
  intent?: Intent;
  children?: any;
}

/** A collapsible panel: a full-width header button flush atop a Blueprint
 * Callout body, both tinted by `intent`. Shared by the map "Experiments" panel
 * (warning) and the heatmap/topology base-layer disclosure (none). */
export function ExpandablePanel({
  isOpen,
  setIsOpen,
  title,
  icon,
  intent = Intent.NONE,
  children,
}: ExpandablePanelProps) {
  return h("div.expandable-panel", { className: isOpen ? "expanded" : null }, [
    h("div.panel-header", [
      h(
        Button,
        {
          minimal: true,
          alignText: "left",
          icon,
          active: isOpen,
          intent,
          onClick: () => setIsOpen(!isOpen),
        },
        title
      ),
    ]),
    h(
      Collapse,
      { isOpen },
      h(Callout, { intent, icon: null }, children)
    ),
  ]);
}
