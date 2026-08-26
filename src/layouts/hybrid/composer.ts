/** The content layer of the hybrid frame: a content slot, a map slot, and an
 * assistant slot whose placement is derived from the layout mode. */

import { useAtomValue } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";

import h from "./composer.module.sass";
import {
  assistantPlacementAtom,
  layoutModeAtom,
  type AssistantPlacement,
  type LayoutMode,
} from "./state";
import { resolveForViewport, useIsNarrowViewport } from "./responsive";

interface ComposerProps {
  content?: ReactNode;
  map?: ReactNode;
  assistant?: ReactNode;
}

export function LayoutComposer({ content, map, assistant }: ComposerProps) {
  const chosenMode = useAtomValue(layoutModeAtom);
  const chosenPlacement = useAtomValue(assistantPlacementAtom);
  const narrow = useIsNarrowViewport();

  const { mode, placement } = resolveForViewport(
    chosenMode,
    chosenPlacement,
    narrow
  );

  return h("div.composer", [
    h(ComposerGrid, { mode, placement, content, map, assistant }),
    h(FloatingAssistant, { visible: placement === "float" }, assistant),
  ]);
}

function ComposerGrid({
  mode,
  placement,
  content,
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
    h("div.content-column", { key: "content" }, content),
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
  // Always mounted so the panel can transition in and out, and so an
  // interactive assistant doesn't lose its state when the mode changes.
  return h(
    "div.floating-assistant",
    { className: classNames({ visible }), "aria-hidden": !visible },
    children
  );
}
