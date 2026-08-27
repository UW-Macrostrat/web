/** Controls for the hybrid frame.
 *
 * Deliberately one button. The top panel is shared with the page's breadcrumbs
 * and whatever the page contributes, so the frame's own affordance is a single
 * labelled view-mode menu rather than a row of unexplained icons.
 *
 * Things that used to live here and don't any more:
 *  - a four-icon mode switcher (now this menu, with labels)
 *  - an assistant show/hide toggle — switching to the list mode says the same
 *    thing more clearly, and in the list+assistant mode there is dead space in
 *    the sidebar anyway, so hiding it bought nothing
 *  - a "Site links" button — the footer has a contextual bottom placement in
 *    the content shell, which is a better home for it
 */

import { Button, Menu, MenuItem, Popover } from "@blueprintjs/core";
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";

import h from "./controls.module.sass";
import {
  capabilitiesAtom,
  layoutModeAtom,
  layoutModeLabel,
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

  const menu = h(
    Menu,
    modes.map((m) =>
      h(MenuItem, {
        key: m,
        icon: modeIcons[m],
        text: layoutModeLabel(m),
        selected: mode === m,
        onClick: () => setMode(m),
      })
    )
  );

  return h(Popover, {
    className,
    minimal: true,
    placement: "bottom-end",
    content: menu,
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(
        Button,
        {
          ...targetProps,
          minimal: true,
          small: true,
          active: isOpen,
          icon: modeIcons[mode],
          rightIcon: "caret-down",
        },
        h("span.mode-label", layoutModeLabel(mode))
      ),
  });
}

/** The frame's controls. A page's own `actions` sit to the left of these. */
export function ActionsPanel({ children }: { children?: ReactNode }) {
  return h("div.actions-panel", [children, h(LayoutModeControl)]);
}
