/** `HybridPage` — a frame for pages that balance a primary content view against
 * a map, with contextual "assistant" content alongside.
 *
 * It is a sliding scale between two existing endmembers rather than a layout of
 * its own: the site's scrolling content page at one end, `MapAreaContainer`
 * (`@macrostrat/map-interface`) at the other. `layoutMode` picks the shell and
 * how open its panels are; see `./composer` for the slot mapping.
 *
 * Host it under `pageStyle: "hybrid"`, which imposes no containment of its own —
 * the content shell scrolls with the document, the map shell locks the viewport.
 */

import { useMemo, type ReactNode } from "react";
import { OverlaysProvider } from "@blueprintjs/core";
import { Provider, useAtomValue, type WritableAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { PageBreadcrumbs } from "~/components";

import h from "./page.module.sass";
import { FooterLinksButton, FooterOverlayTrigger } from "./chrome";
import { LayoutShellView } from "./composer";
import { ActionsPanel } from "./controls";
import {
  buildCapabilities,
  capabilitiesAtom,
  layoutShellAtom,
  type LayoutCapabilities,
} from "./state";

export interface HybridPageProps {
  /** Page-specific controls, shown left of the frame's own layout controls. */
  actions?: ReactNode;
  capabilities?: Partial<LayoutCapabilities>;
  content?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
  /** Page-owned atoms to seed inside the frame's jotai scope. The frame creates
   * its own `Provider`, which isolates *every* atom read below it — so a page
   * can't hydrate its state in an outer provider and expect the slots to see
   * it. Pass the seed values here instead. */
  initialAtoms?: [WritableAtom<any, any, any>, any][];
  className?: string;
}

export function HybridPage(props: HybridPageProps) {
  const { capabilities, initialAtoms, ...rest } = props;
  return h(
    HybridLayoutProvider,
    { capabilities, initialAtoms },
    h(HybridPageInner, rest as HybridPageProps)
  );
}

/** Scopes layout state to this page instance, so two frames on one route (or a
 * frame under a page that owns other jotai state) can't collide. */
function HybridLayoutProvider({ capabilities, initialAtoms, children }) {
  const resolved = useMemo(
    () => buildCapabilities(capabilities),
    [capabilities]
  );
  const atoms = useMemo(
    () => [[capabilitiesAtom, resolved], ...(initialAtoms ?? [])],
    [resolved, initialAtoms]
  );

  // `OverlaysProvider` is required for Blueprint overlays (popovers, dialogs)
  // to position correctly — without it a popover's popper reference goes
  // unmeasured and it parks at the viewport's top-left. Scoped to the frame
  // rather than the app root so no existing page's overlay behavior changes.
  return h(
    Provider,
    h(HydrateAtoms, { atoms }, h(OverlaysProvider, children))
  );
}

function HydrateAtoms({ atoms, children }) {
  useHydrateAtoms(atoms);
  return children;
}

function HybridPageInner({
  actions,
  content,
  map,
  assistant,
  className,
}: HybridPageProps) {
  const shell = useAtomValue(layoutShellAtom);

  const shellView = h(LayoutShellView, {
    content,
    breadcrumbs: h(PageBreadcrumbs, { showLogo: true, separateTitle: false }),
    controls: h(HeaderControls, { actions }),
    map,
    assistant,
  });

  if (shell === "map") {
    return h(
      "div.hybrid-frame.shell-map",
      { className },
      shellView
    );
  }

  // The site footer belongs at the end of the panel's scroll content, not the
  // frame — pages pass `HybridContentFooter` as the panel's `contentFooter`,
  // mirroring `InfiniteScrollPage`. The overlay button stays as a shortcut to
  // the same links from anywhere in a long list.
  return h("div.hybrid-frame.shell-content", { className }, [
    shellView,
    h(FooterOverlayTrigger, { key: "footer-affordance" }),
  ]);
}

/** The layout controls, plus whatever the page contributes. Shells place these
 * themselves — a sticky bar in the content shell, `MapAreaContainer`'s floating
 * navbar in the map shell — which is why they're handed down as a part rather
 * than an assembled header. */
function HeaderControls({ actions }) {
  return h([actions, h(ActionsPanel), h(FooterLinksButton)]);
}
