/** The content layer of the hybrid frame.
 *
 * The two presentations are genuinely different layout systems — independently
 * scrolling grid panes vs. a single scrolling document — so they get separate
 * implementations rather than one structure pretending to cover both. What
 * they share is the slot contract (`content` / `map` / `assistant`) and the
 * mode vocabulary.
 */

import { useAtomValue } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";

import { Footer } from "~/layouts/footer";

import h from "./composer.module.sass";
import {
  assistantPlacementAtom,
  hasMapPane,
  layoutModeAtom,
  resolvedPresentationAtom,
  showAssistantAtom,
  type AssistantPlacement,
  type LayoutMode,
} from "./state";
import { resolveForViewport, useIsNarrowViewport } from "./responsive";

export interface ComposerProps {
  content?: ReactNode;
  /** Page header (breadcrumbs / title / page actions), rendered at the top of
   * the content pane rather than as a second full-width bar. */
  contentHeader?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
}

export function LayoutComposer(props: ComposerProps) {
  const presentation = useAtomValue(resolvedPresentationAtom);

  if (presentation === "content") {
    return h(ContentComposer, props);
  }
  return h(FullscreenComposer, props);
}

/* ---------------------------------------------------------------- content */

/** Closed-form content page: app content width, one document scroll, the real
 * site footer at the bottom, and no hard divisions between regions.
 *
 * The map/assistant sidebar is allowed to overhang the content measure to the
 * right on wide viewports, so the primary content keeps a comfortable reading
 * width instead of being squeezed. Same trick the current `/columns` page
 * uses (`--main-extra-width` there). */
function ContentComposer({
  content,
  contentHeader,
  map,
  assistant,
}: ComposerProps) {
  const mode = useAtomValue(layoutModeAtom);
  const showAssistant = useAtomValue(showAssistantAtom);
  const showMap = hasMapPane(mode);
  const hasSidebar = showMap || showAssistant;

  let mapRegion = null;
  if (showMap) {
    mapRegion = h("div.sidebar-map", map);
  }

  let assistantRegion = null;
  if (showAssistant) {
    assistantRegion = h("div.sidebar-assistant", assistant);
  }

  let sidebar = null;
  if (hasSidebar) {
    sidebar = h("div.content-sidebar", [
      h("div.sidebar-inner", [mapRegion, assistantRegion]),
    ]);
  }

  return h("div.content-frame", [
    h("div.content-frame-inner", [
      contentHeader,
      h("div.content-flow", { className: classNames(`mode-${mode}`, { "has-sidebar": hasSidebar }) }, [
        h("div.content-flow-main", content),
        sidebar,
      ]),
      h(Footer),
    ]),
  ]);
}

/* ------------------------------------------------------------- fullscreen */

function FullscreenComposer({
  content,
  contentHeader,
  map,
  assistant,
}: ComposerProps) {
  const chosenMode = useAtomValue(layoutModeAtom);
  const chosenPlacement = useAtomValue(assistantPlacementAtom);
  const narrow = useIsNarrowViewport();

  const { mode, placement } = resolveForViewport(
    chosenMode,
    chosenPlacement,
    narrow
  );

  return h("div.composer", [
    h(ComposerGrid, {
      mode,
      placement,
      content,
      contentHeader,
      map,
      assistant,
    }),
    h(FloatingAssistant, { visible: placement === "float" }, assistant),
  ]);
}

function ComposerGrid({
  mode,
  placement,
  content,
  contentHeader,
  map,
  assistant,
}: ComposerProps & { mode: LayoutMode; placement: AssistantPlacement }) {
  const className = classNames(`mode-${mode}`, {
    "assistant-column": placement === "column",
    "has-content": mode !== "map-only",
    "has-map": mode !== "content-only",
  });

  let assistantColumn = null;
  if (placement === "column") {
    assistantColumn = h("div.assistant-column-content", assistant);
  }

  return h("div.grid", { className }, [
    h("div.content-column", { key: "content" }, [
      h("div.panel-header", contentHeader),
      h("div.content-pane", content),
    ]),
    h(MapColumn, {
      key: "map",
      map,
      assistant,
      embedAssistant: placement === "embed",
    }),
    h("div.assistant-slot", { key: "assistant" }, assistantColumn),
  ]);
}

function MapColumn({ map, assistant, embedAssistant }) {
  let embedded = null;
  if (embedAssistant) {
    embedded = h("div.embedded-assistant", assistant);
  }

  return h("div.map-column", [
    h("div.map-region", { key: "map" }, map),
    embedded,
  ]);
}

function FloatingAssistant({ visible, children }) {
  // Always mounted so the panel can transition, and so an interactive
  // assistant doesn't lose its state when the mode changes.
  return h(
    "div.floating-assistant",
    { className: classNames({ visible }), "aria-hidden": !visible },
    children
  );
}
