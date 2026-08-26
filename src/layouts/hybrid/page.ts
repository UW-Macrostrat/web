/** `HybridPage` — a configurable frame for pages that balance a primary
 * content view against a map, with contextual "assistant" content alongside.
 *
 * Two presentations (see `./state`): `content` renders as a closed-form
 * content page in normal document flow, and `fullscreen` renders as a
 * viewport-locked app frame. The frame supplies its own containment for both,
 * so host it under a page style that doesn't impose one — `pageStyle: "hybrid"`.
 *
 * Chrome is deliberately thin: one full-width top toolbar (fullscreen only,
 * carrying breadcrumbs + the actions panel), and the page's own header inside
 * the content pane rather than a second full-width bar.
 */

import { useMemo, type ReactNode } from "react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import classNames from "classnames";

import { PageBreadcrumbs, PageTitle } from "~/components";

import h from "./page.module.sass";
import { FooterLinksButton, FooterOverlayTrigger, TopToolbar } from "./chrome";
import { LayoutComposer } from "./composer";
import { ActionsPanel } from "./controls";
import {
  buildCapabilities,
  capabilitiesAtom,
  chromeModeAtom,
  resolvedPresentationAtom,
  type LayoutCapabilities,
} from "./state";

export interface HybridPageProps {
  /** Page-specific controls, shown left of the frame's own layout controls. */
  actions?: ReactNode;
  capabilities?: Partial<LayoutCapabilities>;
  content?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
  /** Optional persistent bottom strip (fullscreen only). There is no default
   * one — the site footer arrives as a dismissable panel instead. */
  bottomBar?: ReactNode;
  className?: string;
}

export function HybridPage(props: HybridPageProps) {
  const { capabilities, ...rest } = props;
  return h(
    HybridLayoutProvider,
    { capabilities },
    h(HybridPageInner, rest as HybridPageProps)
  );
}

/** Scopes layout state to this page instance, so two frames on one route (or a
 * frame under a page that owns other jotai state) can't collide. */
function HybridLayoutProvider({ capabilities, children }) {
  const resolved = useMemo(
    () => buildCapabilities(capabilities),
    [capabilities]
  );
  return h(
    Provider,
    h(HydrateCapabilities, { capabilities: resolved }, children)
  );
}

function HydrateCapabilities({ capabilities, children }) {
  useHydrateAtoms([[capabilitiesAtom, capabilities]]);
  return children;
}

function HybridPageInner({
  actions,
  content,
  map,
  assistant,
  bottomBar,
  className,
}: HybridPageProps) {
  const presentation = useAtomValue(resolvedPresentationAtom);
  const chromeMode = useAtomValue(chromeModeAtom);

  const composer = h(LayoutComposer, {
    content,
    contentHeader: h(PanelHeader, { actions, presentation }),
    map,
    assistant,
  });

  if (presentation === "content") {
    // The footer is at the end of a document that can be thousands of rows
    // long, so it also gets an overlay route in — the same popover, reachable
    // without scrolling to the bottom.
    return h("div.hybrid-frame.presentation-content", { className }, [
      composer,
      h(FooterOverlayTrigger, { key: "footer-affordance" }),
    ]);
  }

  let bottomBarRow = null;
  if (bottomBar != null) {
    bottomBarRow = h("div.bottom-bar-row", bottomBar);
  }

  return h(
    "div.hybrid-frame.presentation-fullscreen",
    {
      className: classNames(className, `chrome-${chromeMode}`, {
        "has-bottom-bar": bottomBar != null,
      }),
    },
    [
      h("div.toolbar-row", { key: "toolbar" }, [
        h(TopToolbar, {
          // No footer to scroll to in this frame, so the site links live with
          // the rest of the chrome rather than as bottom overlay.
          actions: [
            h(ActionsPanel, { key: "actions" }),
            h(FooterLinksButton, { key: "site-links" }),
          ],
          floating: chromeMode === "collapsed",
        }),
      ]),
      h("div.body", { key: "body" }, composer),
      bottomBarRow,
    ]
  );
}

/** The page's own header, inside the content pane.
 *
 * In the content presentation it is the site's standard breadcrumbs + title
 * block, exactly as a content page renders it. In the fullscreen presentation
 * the breadcrumbs already live in the toolbar, so only the title shows — and
 * page actions ride along, since there's no second full-width bar for them. */
function PanelHeader({ actions, presentation }) {
  let titling = h(PageTitle, { headingLevel: 1, className: "panel-title" });
  if (presentation === "content") {
    titling = h(PageBreadcrumbs, { showLogo: true, separateTitle: true });
  }

  let actionsRegion = null;
  if (actions != null) {
    actionsRegion = h("div.panel-actions", actions);
  }

  // In the content presentation the frame has no toolbar, so the layout
  // controls join the page header.
  let layoutControls = null;
  if (presentation === "content") {
    layoutControls = h("div.panel-layout-controls", h(ActionsPanel));
  }

  return h("div.panel-header-inner", { className: `header-${presentation}` }, [
    h("div.panel-titling", titling),
    actionsRegion,
    layoutControls,
  ]);
}
