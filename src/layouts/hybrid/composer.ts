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

import { atom, useAtomValue, useSetAtom, type Atom } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";
import { Button } from "@blueprintjs/core";

import { onDemand } from "~/_utils";

import h from "./composer.module.sass";
import { FloatingMapPanel } from "./map-placement";
import { ResizeHandle } from "./resize-handle";
import {
  capabilitiesAtom,
  contentScrollAtom,
  floatingMapOpenAtom,
  hasInsetMap,
  mapPlacementCountAtom,
  hasSidebar,
  isFullWidth,
  layoutModeAtom,
  layoutShellAtom,
  showAssistantAtom,
  type LayoutMode,
} from "./state";

const neverIdleAtom = atom(false);

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
  /** Shown immediately after the title, inside the titling area: a status tag
   * or badge that belongs to the page's identity rather than to its controls
   * (which sit at the other end of the row). */
  titleAdornment?: ReactNode;
  controls?: ReactNode;
  /** The page header as one assembled row (`SitePageHeader`), for the shells
   * that show a header row (content, split). When given, it replaces the
   * `breadcrumbs` / `titleAdornment` / `controls` row there; the map shell
   * still assembles those parts into its floating navbar. */
  header?: ReactNode;
  /** Second header row (active filters), at the content's width. */
  filterBar?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
  /** The view menu and page links, at the foot of the content sidebar */
  sidebarLinks?: ReactNode;
  /** See `HybridPage` */
  assistantIdle?: Atom<boolean>;
  /** The site footer, after the content in page-scroll mode */
  footer?: ReactNode;
}

export function LayoutShellView(props: ShellProps) {
  const shell = useAtomValue(layoutShellAtom);
  const mode = useAtomValue(layoutModeAtom);
  const showAssistant = useAtomValue(showAssistantAtom);
  // An idle assistant isn't worth a panel floating over the map
  const assistantIdle = useAtomValue(props.assistantIdle ?? neverIdleAtom);
  const showFloatingAssistant = showAssistant && !assistantIdle;

  if (shell === "map") {
    return h(MapShell, { ...props, mode, showAssistant: showFloatingAssistant });
  }
  if (shell === "split") {
    return h(SplitShell, { ...props, showAssistant: showFloatingAssistant });
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
  header,
  breadcrumbs,
  titleAdornment,
  controls,
  filterBar,
  map,
  assistant,
  sidebarLinks,
  footer,
  mode,
  showAssistant,
}: ShellProps & { mode: string; showAssistant: boolean }) {
  // `content-only` / `content-full` mean *only* the content — no sidebar at
  // all. `content-primary` adds the map and assistant as a column beside it;
  // `content-inset` floats the map over full-width content instead.
  const sidebar = hasSidebar(mode as LayoutMode);
  const inset = hasInsetMap(mode as LayoutMode);
  const fullWidth = isFullWidth(mode as LayoutMode);
  // `panel`: the content fills the scroll region; `page`: it grows with itself.
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
      // The view menu and links beneath the map, ahead of the assistant's
      // content, which can run long
      sidebarLinks,
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

  // The map on request, at the top of the content, when the page hasn't
  // placed it somewhere better (see `HybridMapPlacement`)
  const floatingMapOpen = useAtomValue(floatingMapOpenAtom);
  const placements = useAtomValue(mapPlacementCountAtom);
  let floatingMap = null;
  if (
    contentScroll == "page" &&
    !sidebar &&
    !inset &&
    floatingMapOpen &&
    placements == 0
  ) {
    floatingMap = h(FloatingMapPanel, { key: "floating-map" }, map);
  }
  let holder = h("div.content-panel-holder", content);

  const className = classNames(`mode-${mode}`, `scroll-${contentScroll}`, {
    "has-sidebar": sidebar,
    "has-inset": inset,
    "full-width": fullWidth,
  });

  const headerRegion = h("header.content-header", [
    h(HeaderRow, { header, breadcrumbs, titleAdornment, controls }),
    h.if(filterBar != null)("div.header-filters", filterBar),
  ]);

  if (contentScroll == "page") {
    // Without a sidebar, its content follows the page's own
    let afterContent = null;
    if (!sidebar) {
      afterContent = h("div.content-after", [sidebarLinks, assistant]);
    }
    // The footer ends the content column rather than spanning the sidebar, so
    // a tall sidebar never has to be scrolled past to reach it
    holder = h("div.content-panel-holder", [
      h("div.content-flow", [floatingMap, content]),
      afterContent,
      h.if(footer != null)("div.content-page-footer", footer),
    ]);
    return h(
      "div.content-shell",
      { className },
      h(PageScrollBody, { headerRegion, holder, sidebarRegion, insetRegion })
    );
  }

  const body = h(ScrollBody, { holder, sidebar, sidebarRegion, insetRegion });

  return h("div.content-shell", { className }, [headerRegion, body]);
}

/** One tall item: the header and the content's row scroll together, so the
 * header can collapse to its bar as the page title passes under it. The
 * sidebar is a sticky column in the row rather than an overlay. */
function PageScrollBody({ headerRegion, holder, sidebarRegion, insetRegion }) {
  let resizeHandle = null;
  if (sidebarRegion != null) {
    resizeHandle = h(ResizeHandle, { edge: "sidebar" });
  }
  return h("div.content-body", [
    h("div.content-scroll", [
      headerRegion,
      h("div.content-main", [holder, resizeHandle, sidebarRegion, insetRegion]),
    ]),
  ]);
}

/** Everything below the header scrolls as one, with the scrollbar at the
 * window's edge rather than the content's.
 *
 * In `panel` mode the content column is exactly as tall as the scroller, so a
 * pane that fills its height (a chart, an editor) is unchanged and only an
 * overflowing list scrolls it; in `page` mode it grows with its content. The
 * sidebar rides in a layer over the scroller, in the column a spacer keeps
 * free, so it never scrolls and never passes under the header. */
function ScrollBody({ holder, sidebar, sidebarRegion, insetRegion }) {
  let spacer = null;
  let resizeHandle = null;
  if (sidebar) {
    spacer = h("div.sidebar-spacer");
    resizeHandle = h(ResizeHandle, { edge: "sidebar", centered: true });
  }
  return h("div.content-body", [
    h("div.content-scroll", h("div.content-main", [holder, spacer])),
    h("div.content-overlay", [
      h("div.content-main", [
        h("div.content-spacer"),
        resizeHandle,
        sidebarRegion,
      ]),
      insetRegion,
    ]),
  ]);
}

/** The header row: the assembled page header when there is one, else the
 * breadcrumbs, adornment and controls laid out side by side. */
function HeaderRow({ header, breadcrumbs, titleAdornment, controls }) {
  if (header != null) {
    return h("div.header-row", header);
  }
  return h("div.header-row", [
    h("div.header-titling", [breadcrumbs, titleAdornment]),
    h("div.header-controls", controls),
  ]);
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
  header,
  breadcrumbs,
  titleAdornment,
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
        h(HeaderRow, { header, breadcrumbs, titleAdornment, controls }),
        h.if(filterBar != null)("div.header-filters", filterBar),
      ]),
      h("div.split-list", content),
    ]),
    h(ResizeHandle, { edge: "split" }),
    h("div.split-map", [map, assistantPanel]),
  ]);
}
