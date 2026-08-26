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

import { useAtomValue } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";

import { onDemand } from "~/_utils";

import h from "./composer.module.sass";
import { hasMapPane, layoutModeAtom, layoutShellAtom, showAssistantAtom } from "./state";

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
  map,
  assistant,
  mode,
  showAssistant,
}: ShellProps & { mode: string; showAssistant: boolean }) {
  // `content-only` means *only* the list — no sidebar at all, so it reads as
  // the plain list page. The assistant rides in the sidebar alongside the map
  // rather than claiming a column of its own.
  const hasSidebar = hasMapPane(mode as any);

  let mapRegion = null;
  let assistantRegion = null;
  if (hasSidebar) {
    mapRegion = h("div.sidebar-map", map);
    if (showAssistant) {
      assistantRegion = h("div.sidebar-assistant", assistant);
    }
  }

  let sidebar = null;
  if (hasSidebar) {
    sidebar = h("div.content-sidebar", [mapRegion, assistantRegion]);
  }

  return h(
    "div.content-shell",
    { className: classNames(`mode-${mode}`, { "has-sidebar": hasSidebar }) },
    [
      h("header.content-header", [
        h("div.header-titling", breadcrumbs),
        h("div.header-controls", controls),
      ]),
      h("div.content-main", [
        h("div.content-panel-holder", content),
        sidebar,
      ]),
    ]
  );
}
