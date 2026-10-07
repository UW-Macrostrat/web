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

import {
  AnchorButton,
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  PopoverNext,
  Tag,
} from "@blueprintjs/core";
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";

import h from "./controls.module.sass";
import {
  capabilitiesAtom,
  floatingMapOpenAtom,
  layoutModeAtom,
  layoutModeLabel,
  type LayoutMode,
} from "./state";

const modeIcons: Record<LayoutMode, string> = {
  "content-only": "list",
  "content-primary": "list-detail-view",
  "content-full": "maximize",
  "content-inset": "widget",
  "map-primary": "map",
  "map-only": "globe",
};

/** A page the frame links out to — another view of the same subject, such as
 * the correlation chart beside the column list. */
export interface HybridLink {
  label: string;
  href: string;
  icon?: string;
  /** A small tag after the label, e.g. "Beta" */
  tag?: string;
}

export interface LayoutModeControlProps {
  className?: string | null;
  /** Icon and caret only, the label as a tooltip — for the narrow panels of
   * the map and split shells, where a labelled button wraps the header. */
  compact?: boolean;
  /** Listed in the menu after the modes */
  links?: HybridLink[];
  /** Offer the map on request, for a page that hasn't placed one */
  mapItem?: boolean;
}

export function LayoutModeControl({
  className = null,
  compact = false,
  links = [],
  mapItem = false,
}: LayoutModeControlProps) {
  const { modes, itemName } = useAtomValue(capabilitiesAtom);
  const [mode, setMode] = useAtom(layoutModeAtom);
  const [mapOpen, setMapOpen] = useAtom(floatingMapOpenAtom);

  if (modes.length < 2) return null;

  const currentLabel = layoutModeLabel(mode, itemName);
  let label = h("span.mode-label", currentLabel);
  if (compact) label = null;

  let linkItems = [];
  if (links.length > 0) {
    linkItems = [
      h(MenuDivider, { key: "links-divider" }),
      ...links.map((link) =>
        h(MenuItem, {
          key: link.href,
          icon: link.icon ?? "share",
          text: link.label,
          href: link.href,
          labelElement: linkTag(link),
        })
      ),
    ];
  }

  let mapItems = [];
  if (mapItem) {
    let text = "Show map";
    if (mapOpen) text = "Hide map";
    mapItems = [
      h(MenuDivider, { key: "map-divider" }),
      h(MenuItem, {
        key: "map",
        icon: "map",
        text,
        onClick: () => setMapOpen(!mapOpen),
      }),
    ];
  }

  const menu = h(Menu, [
    ...modes.map((m) =>
      h(MenuItem, {
        key: m,
        icon: modeIcons[m],
        text: layoutModeLabel(m, itemName),
        selected: mode === m,
        onClick: () => setMode(m),
      })
    ),
    ...mapItems,
    ...linkItems,
  ]);

  return h(PopoverNext, {
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
          title: currentLabel,
        },
        label
      ),
  });
}

function linkTag(link: HybridLink) {
  if (link.tag == null) return undefined;
  return h(Tag, { minimal: true }, link.tag);
}

/** The frame's controls. A page's own `actions` sit to the left of these.
 * Without `showModeControl` the mode menu lives elsewhere (the sidebar). */
export function ActionsPanel({
  children,
  compact = false,
  links = [],
  showModeControl = true,
  mapItem = false,
}: {
  children?: ReactNode;
  compact?: boolean;
  links?: HybridLink[];
  showModeControl?: boolean;
  mapItem?: boolean;
}) {
  let modeControl = null;
  if (showModeControl) {
    modeControl = h(LayoutModeControl, { compact, links, mapItem });
  }
  return h("div.actions-panel", [children, modeControl]);
}

/** The view menu and the page's links as buttons, at the foot of the content
 * shell's sidebar: what to look at next, beside the map rather than the title. */
export function SidebarViewLinks({
  links = [],
  showModeControl = true,
}: {
  links?: HybridLink[];
  showModeControl?: boolean;
}) {
  let modeControl = null;
  if (showModeControl) modeControl = h(LayoutModeControl);
  return h("div.sidebar-view-links", [
    modeControl,
    ...links.map((link) =>
      h(
        AnchorButton,
        {
          key: link.href,
          href: link.href,
          icon: link.icon ?? "share",
          minimal: true,
          small: true,
        },
        [link.label, " ", linkTag(link)]
      )
    ),
  ]);
}

