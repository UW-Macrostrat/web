/** Controls for the hybrid frame.
 *
 * The layout-mode switcher stays inline — it's the primary axis and worth
 * direct manipulation. Everything else (framing, assistant visibility, site
 * links) is coalesced into a single `ActionsPanel` popover so the toolbar
 * doesn't accumulate a row of switches.
 *
 * Every control hides itself when the page's capabilities make it
 * meaningless, so a restricted page shows no dead affordance.
 */

import { Button, ButtonGroup, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";

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

export function LayoutModeControl({ className = null, showLabels = false }) {
  const { modes } = useAtomValue(capabilitiesAtom);
  const [mode, setMode] = useAtom(layoutModeAtom);

  if (modes.length < 2) return null;

  return h(
    ButtonGroup,
    { className, minimal: true, small: true },
    modes.map((m) => {
      let label = null;
      if (showLabels) {
        label = h("span.mode-label", layoutModeLabel(m));
      }
      return h(
        Button,
        {
          key: m,
          active: mode === m,
          icon: modeIcons[m],
          title: layoutModeLabel(m),
          onClick: () => setMode(m),
        },
        label
      );
    })
  );
}

/** Framing, assistant visibility and the site footer, in one popover. */
export function ActionsPanel({ children }: { children?: ReactNode }) {
  return h("div.actions-panel", [
    children,
    h(AssistantToggle),
    h(LayoutModeControl),
    h(Popover, {
      minimal: true,
      placement: "bottom-end",
      content: h(ViewMenu),
      // `renderTarget` rather than a child element: Blueprint then owns the
      // target ref directly instead of cloning a child to attach it. Passing
      // the button as a child left the popper reference unmeasured, which
      // parks the popover at the viewport's top-left corner.
      renderTarget: ({ isOpen, ...targetProps }) =>
        h(Button, {
          ...targetProps,
          minimal: true,
          small: true,
          active: isOpen,
          icon: "cog",
          rightIcon: "caret-down",
          title: "View options",
        }),
    }),
  ]);
}

function ViewMenu() {
  const { hasAssistant } = useAtomValue(capabilitiesAtom);
  const [showAssistant, setShowAssistant] = useAtom(showAssistantAtom);

  const items: ReactNode[] = [];

  if (hasAssistant) {
    items.push(h(MenuDivider, { key: "panels", title: "Panels" }));
    items.push(
      h(MenuItem, {
        key: "assistant",
        icon: "info-sign",
        text: "Details panel",
        selected: showAssistant,
        onClick: () => setShowAssistant(!showAssistant),
      })
    );
  }

  return h(Menu, items);
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
