/** Drag handles on the boundary between the content and the map.
 *
 * Beside the content shell's sidebar, dragging sets the sidebar's width; on the
 * split shell's panel, the panel's. Either is remembered for this kind of page,
 * and a double-click returns it to the default. Dragged far enough that the
 * other side would dominate, the handle offers that view instead, and
 * releasing there switches to it.
 */
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import classNames from "classnames";
import { useCallback, useRef, useState } from "react";

import h from "./resize-handle.module.sass";
import {
  capabilitiesAtom,
  layoutModeAtom,
  layoutModeLabel,
  sidebarWidthsAtom,
  splitPanelWidthsAtom,
  type LayoutMode,
} from "./state";

const MIN_SIDE_WIDTH = 240;
const MIN_MAIN_WIDTH = 320;
/** Past this share of the row, the dragged side takes over the view */
const SWITCH_FRACTION = 0.6;

type HandleEdge = "sidebar" | "split";

interface EdgeSpec {
  widthsAtom: typeof sidebarWidthsAtom;
  /** The view to offer once the dragged side passes the threshold */
  switchTo: LayoutMode;
  /** +1 if dragging right widens the side, -1 if dragging left does */
  direction: 1 | -1;
  sideOf(handle: HTMLElement): HTMLElement | null;
}

const edges: Record<HandleEdge, EdgeSpec> = {
  sidebar: {
    widthsAtom: sidebarWidthsAtom,
    switchTo: "map-primary",
    direction: -1,
    sideOf: (handle) => handle.nextElementSibling as HTMLElement | null,
  },
  split: {
    widthsAtom: splitPanelWidthsAtom,
    switchTo: "content-primary",
    direction: 1,
    sideOf: (handle) => handle.previousElementSibling as HTMLElement | null,
  },
};

interface DragStart {
  x: number;
  width: number;
  row: number;
}

export function ResizeHandle({
  edge,
  centered = false,
}: {
  edge: HandleEdge;
  /** Grip at the middle of the handle's box rather than of the window, for a
   * box that doesn't scroll */
  centered?: boolean;
}) {
  const spec = edges[edge];
  const { itemName, modes } = useAtomValue(capabilitiesAtom);
  const setWidths = useSetAtom(spec.widthsAtom);
  const [, setMode] = useAtom(layoutModeAtom);
  const drag = useRef<DragStart | null>(null);
  const [armed, setArmed] = useState(false);
  const canSwitch = modes.includes(spec.switchTo);

  const setWidth = useCallback(
    (width: number | null) =>
      setWidths((prev) => {
        const next = { ...prev };
        if (width == null) {
          delete next[itemName];
        } else {
          next[itemName] = Math.round(width);
        }
        return next;
      }),
    [itemName, setWidths]
  );

  const onPointerDown = (evt: React.PointerEvent<HTMLDivElement>) => {
    const handle = evt.currentTarget;
    const side = spec.sideOf(handle);
    const row = handle.parentElement;
    if (side == null || row == null) return;
    // Read once, at the start of a drag; nothing is measured while laying out
    drag.current = {
      x: evt.clientX,
      width: side.getBoundingClientRect().width,
      row: row.getBoundingClientRect().width,
    };
    handle.setPointerCapture(evt.pointerId);
    evt.preventDefault();
  };

  const onPointerMove = (evt: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start == null) return;
    const width = start.width + spec.direction * (evt.clientX - start.x);
    const threshold = start.row * SWITCH_FRACTION;
    const pastThreshold = canSwitch && width > threshold;
    setArmed(pastThreshold);
    const max = Math.min(start.row - MIN_MAIN_WIDTH, threshold);
    setWidth(Math.min(Math.max(width, MIN_SIDE_WIDTH), max));
  };

  const onPointerCancel = (evt: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    setArmed(false);
    evt.currentTarget.releasePointerCapture(evt.pointerId);
  };

  const onPointerUp = (evt: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    evt.currentTarget.releasePointerCapture(evt.pointerId);
    if (!armed) return;
    setArmed(false);
    // The new view starts from its own default split
    setWidth(null);
    setMode(spec.switchTo);
  };

  let hint = null;
  if (armed) {
    const label = layoutModeLabel(spec.switchTo, itemName);
    hint = h("div.switch-hint", `Release for “${label}”`);
  }

  return h(
    "div.resize-handle",
    {
      className: classNames(`edge-${edge}`, { armed, centered }),
      role: "separator",
      "aria-orientation": "vertical",
      title: "Drag to resize; double-click to reset",
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onDoubleClick: () => setWidth(null),
    },
    h("div.grip", hint)
  );
}
