/** The two shells the hybrid frame slides between.
 *
 * Neither is invented here. The map end *is* `MapAreaContainer`
 * (`@macrostrat/map-interface`), already evolved on the main map page. The list
 * end mirrors `~/components/infinite-scroll`'s `InfiniteScrollPage`, already
 * evolved on the map-ingestion list: **viewport-locked, with the data panel as
 * the scroller** — not a document-scrolling page. That's what lets the panel's
 * floating filter/sort toolbar pin to the top of the list, and what puts the
 * real site footer at the end of the panel's scroll content (via its
 * `contentFooter`) rather than the end of the document.
 *
 * Both receive one slot contract — `content` / `map` / `assistant` — and the
 * layout mode picks which shell gets it.
 */

import { useAtomValue, useSetAtom } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";
import { Button } from "@blueprintjs/core";

import { onDemand } from "~/_utils";

import h from "./composer.module.sass";
import {
  capabilitiesAtom,
  contentScrollAtom,
  hasInsetMap,
  hasSidebar,
  isFullWidth,
  layoutModeAtom,
  layoutShellAtom,
  showAssistantAtom,
  type LayoutMode,
} from "./state";

const MapShell = onDemand(() =>
  import("./map-shell.client").then((mod) => mod.MapShell)
);

export interface ShellProps {
  content?: ReactNode;
  /** Page identity — breadcrumbs with an inline title. Passed separately from
   * `controls` because the two shells assemble them differently: the content
   * shell into a header row of its own, the map shell into
   * `MapAreaContainer`'s floating navbar. */
  breadcrumbs?: ReactNode;
  controls?: ReactNode;
  /** Second header row (active filters), at the content's width. */
  filterBar?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
}

export function LayoutShellView(props: ShellProps) {
  const shell = useAtomValue(layoutShellAtom);
  const mode = useAtomValue(layoutModeAtom);
  const showAssistant = useAtomValue(showAssistantAtom);

  if (shell === "map") {
    return h(MapShell, { ...props, mode, showAssistant });
  }
  if (shell === "split") {
    return h(SplitShell, { ...props, showAssistant });
  }
  return h(ContentShell, { ...props, mode, showAssistant });
}

/* ---------------------------------------------------------- content shell */

/** The list endmember. With `content-only` this should be hard to tell apart
 * from `InfiniteScrollPage`: a header at the content measure, then the panel
 * filling the rest of the viewport as its own scroller. `content-primary` adds
 * the map and assistant as a second column beside it — the only structural
 * difference between the two modes. */
function ContentShell({
  content,
  breadcrumbs,
  controls,
  filterBar,
  map,
  assistant,
  mode,
  showAssistant,
}: ShellProps & { mode: string; showAssistant: boolean }) {
  // `content-only` / `content-full` mean *only* the content — no sidebar at
  // all. `content-primary` adds the map and assistant as a column beside it;
  // `content-inset` floats the map over full-width content instead.
  const sidebar = hasSidebar(mode as LayoutMode);
  const inset = hasInsetMap(mode as LayoutMode);
  const fullWidth = isFullWidth(mode as LayoutMode);
  // `panel`: the content is the scroller (data panel); `page`: the document is.
  const contentScroll = useAtomValue(contentScrollAtom);

  let sidebarRegion = null;
  if (sidebar) {
    let assistantRegion = null;
    if (showAssistant) {
      assistantRegion = h("div.sidebar-assistant", assistant);
    }
    sidebarRegion = h("div.content-sidebar", [
      h("div.sidebar-map", [
        map,
        // Shrink to the inset, when the page offers that mode
        h(ModeSwitchButton, { target: "content-inset", icon: "minimize" }),
      ]),
      assistantRegion,
    ]);
  }

  let insetRegion = null;
  if (inset) {
    insetRegion = h("div.content-inset-map", [
      map,
      // Grow the inset into the sidebar, when the page offers that mode
      h(ModeSwitchButton, { target: "content-primary", icon: "maximize" }),
    ]);
  }

  return h(
    "div.content-shell",
    {
      className: classNames(`mode-${mode}`, `scroll-${contentScroll}`, {
        "has-sidebar": sidebar,
        "has-inset": inset,
        "full-width": fullWidth,
      }),
    },
    [
      h("header.content-header", [
        h("div.header-row", [
          h("div.header-titling", breadcrumbs),
          h("div.header-controls", controls),
        ]),
        h.if(filterBar != null)("div.header-filters", filterBar),
      ]),
      h("div.content-main", [
        h("div.content-panel-holder", content),
        sidebarRegion,
        insetRegion,
      ]),
    ]
  );
}

/** A small overlay button on the map that switches to another layout mode —
 * the inset's "expand", the sidebar map's "shrink". Renders nothing when the
 * page doesn't offer the target mode. */
function ModeSwitchButton({
  target,
  icon,
}: {
  target: LayoutMode;
  icon: string;
}) {
  const { modes } = useAtomValue(capabilitiesAtom);
  const setMode = useSetAtom(layoutModeAtom);
  if (!modes.includes(target)) return null;
  return h(Button, {
    className: "mode-switch-button",
    icon,
    small: true,
    title: "Switch layout",
    onClick: () => setMode(target),
  });
}

/* -------------------------------------------------------------- split shell */

/** A fixed left panel with the map filling the entire right of the screen.
 *
 * The page header sits at the top of the *panel* rather than spanning the
 * window, so the map really does reach the top and right edges. The assistant
 * floats over the map instead of taking a third column, which would leave the
 * list too narrow to read.
 */
function SplitShell({
  content,
  breadcrumbs,
  controls,
  filterBar,
  map,
  assistant,
  showAssistant,
}: ShellProps & { showAssistant: boolean }) {
  let assistantPanel = null;
  if (showAssistant) {
    assistantPanel = h("div.split-assistant", assistant);
  }

  return h("div.split-shell", [
    h("div.split-panel", [
      h("header.split-header", [
        h("div.header-row", [
          h("div.header-titling", breadcrumbs),
          h("div.header-controls", controls),
        ]),
        h.if(filterBar != null)("div.header-filters", filterBar),
      ]),
      h("div.split-list", content),
    ]),
    h("div.split-map", [map, assistantPanel]),
  ]);
}
