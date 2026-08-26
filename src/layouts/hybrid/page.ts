/** `HybridPage` — a configurable frame for pages that balance a primary
 * content view against a map, with contextual "assistant" content alongside.
 *
 * Compose it inside a page declaring `pageStyle: "fullscreen"`, which supplies
 * the viewport-locked container this frame fills.
 *
 * Everything derives from one scalar (`layoutMode`, see `./state`); pages
 * narrow what's on offer through `capabilities`.
 */

import { useMemo, type ReactNode } from "react";
import { Provider, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import classNames from "classnames";

import h from "./page.module.sass";
import {
  AppFooterBar,
  AppHeaderBar,
  BrandMark,
  FooterSheet,
  FooterSheetTrigger,
} from "./chrome";
import { LayoutComposer } from "./composer";
import { AssistantToggle, LayoutModeControl } from "./controls";
import {
  buildCapabilities,
  capabilitiesAtom,
  chromeModeAtom,
  type LayoutCapabilities,
} from "./state";

export interface HybridPageProps {
  title?: ReactNode;
  /** Page-specific controls, shown left of the layout controls. */
  actions?: ReactNode;
  capabilities?: Partial<LayoutCapabilities>;
  content?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
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
  return h(Provider, h(HydrateCapabilities, { capabilities: resolved }, children));
}

function HydrateCapabilities({ capabilities, children }) {
  useHydrateAtoms([[capabilitiesAtom, capabilities]]);
  return children;
}

function HybridPageInner({
  title,
  actions,
  content,
  map,
  assistant,
  className,
}: HybridPageProps) {
  const chromeMode = useAtomValue(chromeModeAtom);
  const reserved = chromeMode === "reserved";

  return h(
    "div.hybrid-page",
    { className: classNames(className, `chrome-${chromeMode}`) },
    [
      h("div.app-header-row", { key: "header" }, [
        h.if(reserved)(AppHeaderBar),
      ]),
      h("div.body", { key: "body" }, [
        h(PageBar, { title, actions, showBrand: !reserved }),
        h(
          "div.body-content",
          h(LayoutComposer, { content, map, assistant })
        ),
        h.if(!reserved)(FooterSheetTrigger, { floating: true }),
      ]),
      h("div.app-footer-row", { key: "footer" }, [
        h.if(reserved)(AppFooterBar),
      ]),
      h(FooterSheet, { key: "sheet" }),
    ]
  );
}

/** Page-level chrome: what am I doing right now. Distinct from the app-level
 * bar above it (what app is this) — except when app chrome collapses, at which
 * point this bar absorbs the brand mark and floats over the content, so a
 * map-dominant view is never a dead end. */
function PageBar({ title, actions, showBrand }) {
  let titleElement = null;
  if (title != null) {
    titleElement = h("h1.page-title", title);
  }

  return h("div.page-bar", [
    h.if(showBrand)(BrandMark),
    titleElement,
    h("div.page-actions", actions),
    h("div.layout-controls", [h(AssistantToggle), h(LayoutModeControl)]),
  ]);
}
