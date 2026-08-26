/** Page-level controls for the hybrid frame. Both hide themselves when the
 * page's capabilities make them meaningless, so a page that allows only one
 * mode (or has no assistant content) gets no dead affordance. */

import { Button, ButtonGroup } from "@blueprintjs/core";
import { useAtom, useAtomValue } from "jotai";

import h from "./controls.module.sass";
import {
  capabilitiesAtom,
  layoutModeAtom,
  layoutModeLabel,
  showAssistantAtom,
  type LayoutMode,
} from "./state";

const modeIcons: Record<LayoutMode, string> = {
  "content-only": "list",
  "content-primary": "list-detail-view",
  "map-primary": "map",
  "map-only": "globe",
};

export function LayoutModeControl({ className = null }) {
  const { modes } = useAtomValue(capabilitiesAtom);
  const [mode, setMode] = useAtom(layoutModeAtom);

  if (modes.length < 2) return null;

  return h(
    ButtonGroup,
    { className, minimal: true, small: true },
    modes.map((m) =>
      h(
        Button,
        {
          key: m,
          active: mode === m,
          icon: modeIcons[m],
          title: layoutModeLabel(m),
          onClick: () => setMode(m),
        },
        h("span.mode-label", layoutModeLabel(m))
      )
    )
  );
}

export function AssistantToggle({ className = null }) {
  const { hasAssistant } = useAtomValue(capabilitiesAtom);
  const [show, setShow] = useAtom(showAssistantAtom);

  if (!hasAssistant) return null;

  let text = "Details";
  if (show) {
    text = "Hide details";
  }

  return h(
    Button,
    {
      className,
      minimal: true,
      small: true,
      active: show,
      icon: "info-sign",
      onClick: () => setShow(!show),
    },
    h("span.toggle-label", text)
  );
}
