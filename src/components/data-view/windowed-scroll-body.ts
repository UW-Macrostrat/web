/** A windowed (virtualized) scroll body for `@macrostrat/data-sheet`'s
 * `DataPanel`.
 *
 * `DataPanel` hands its `scrollBody` the *already-created* card elements and
 * keeps ownership of the scroll container, so windowing is purely a rendering
 * concern here: we mount a viewport's worth of cards and position them
 * absolutely inside a spacer sized to the full list. Creating N elements costs
 * little; mounting N DOM subtrees is what doesn't scale.
 *
 * This is why windowing does **not** have to imply paged loading. Pass
 * `DataPanel` an in-memory `data` array and it loads the whole thing in one
 * page (its local provider sets `pageSize` to the row count), so there is no
 * infinite-scroll sentinel to fight and no partially-loaded dataset — which
 * keeps list↔map selection sync exact, since every row is always addressable.
 *
 * Group headers are emitted from the row data itself (`groupOf`), read from the
 * panel's store — the scroll body renders inside the provider, so it can see
 * the live rows rather than needing them threaded in.
 */

import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useSelector } from "@macrostrat/data-sheet";

import h from "./windowed-scroll-body.module.sass";

export interface RowGroup {
  key: string | number;
  label: ReactNode;
}

export interface WindowedScrollBodyOptions<T = any> {
  /** Fixed height of one card, in px. Cards are absolutely positioned, so this
   * has to be right — set it from the card's own styling. */
  rowHeight: number;
  /** Fixed height of a group header, in px. */
  groupHeight?: number;
  /** Extra cards rendered above and below the viewport. */
  overscan?: number;
  /** Derive a row's group. A new group header is emitted whenever the key
   * changes between consecutive rows, so a re-sorted list simply produces
   * different runs rather than breaking. Return null for no grouping. */
  groupOf?: (row: T) => RowGroup | null;
}

interface ScrollBodyProps {
  children?: ReactNode;
}

type Item =
  | { type: "group"; group: RowGroup; top: number; height: number }
  | { type: "row"; cardIndex: number; top: number; height: number };

export function createWindowedScrollBody<T = any>(
  options: WindowedScrollBodyOptions<T>
): ComponentType<ScrollBodyProps> {
  const {
    rowHeight,
    groupHeight = rowHeight,
    overscan = 8,
    groupOf,
  } = options;

  return function WindowedScrollBody({ children }: ScrollBodyProps) {
    const rows = useSelector<T, T[]>((state) => state.data) ?? [];
    const cards = useMemo(() => Children.toArray(children), [children]);

    const rootRef = useRef<HTMLDivElement | null>(null);
    const viewport = useScrollViewport(rootRef);

    const nonNullRows = useMemo(() => rows.filter((r) => r != null), [rows]);

    const items = useMemo(
      () => buildItems(nonNullRows, groupOf, rowHeight, groupHeight),
      [nonNullRows]
    );

    // During a load the panel appends skeleton cards, so the card list and the
    // row list disagree. Windowing on a mismatched mapping would show the wrong
    // rows, so fall back to plain rendering for that transient window.
    const aligned = cards.length === nonNullRows.length;

    if (!aligned || items.length === 0) {
      return h("div.windowed-body.unwindowed", { ref: rootRef }, cards);
    }

    const totalHeight = items[items.length - 1].top + items[items.length - 1].height;
    const [start, end] = visibleRange(items, viewport, overscan, rowHeight);

    const rendered = [];
    for (let i = start; i < end; i++) {
      const item = items[i];
      const style = { top: item.top, height: item.height };
      if (item.type === "group") {
        rendered.push(
          h(
            "div.windowed-group-header",
            { key: `group-${item.group.key}`, style },
            item.group.label
          )
        );
        continue;
      }
      rendered.push(
        h(
          "div.windowed-row",
          { key: `row-${item.cardIndex}`, style },
          cards[item.cardIndex]
        )
      );
    }

    return h(
      "div.windowed-body",
      { ref: rootRef, style: { height: totalHeight } },
      rendered
    );
  };
}

function buildItems<T>(
  rows: T[],
  groupOf: ((row: T) => RowGroup | null) | undefined,
  rowHeight: number,
  groupHeight: number
): Item[] {
  const items: Item[] = [];
  let top = 0;
  let lastKey: string | number | null = null;

  rows.forEach((row, cardIndex) => {
    const group = groupOf?.(row) ?? null;
    if (group != null && group.key !== lastKey) {
      items.push({ type: "group", group, top, height: groupHeight });
      top += groupHeight;
      lastKey = group.key;
    }
    items.push({ type: "row", cardIndex, top, height: rowHeight });
    top += rowHeight;
  });

  return items;
}

interface Viewport {
  top: number;
  height: number;
}

function visibleRange(
  items: Item[],
  viewport: Viewport,
  overscan: number,
  rowHeight: number
): [number, number] {
  // Before the scroll container is measured, render one nominal screenful so
  // the first paint isn't empty.
  if (viewport.height === 0) {
    return [0, Math.min(items.length, overscan * 4)];
  }

  const pad = overscan * rowHeight;
  const first = findItemAt(items, viewport.top - pad);
  const last = findItemAt(items, viewport.top + viewport.height + pad);
  return [first, Math.min(items.length, last + 1)];
}

/** Index of the last item starting at or before `offset` (binary search over
 * the monotonically increasing `top` values). */
function findItemAt(items: Item[], offset: number): number {
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (items[mid].top <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/** The band of this list that is actually on screen, in list-relative pixels.
 *
 * Measured as the intersection of the window viewport with the nearest
 * *clipping* ancestor, which covers both presentations without needing to know
 * which one is active: in the fullscreen frame `DataPanel`'s own bounded body
 * is that ancestor and the intersection is the pane; in the content
 * presentation nothing is bounded, so the intersection is simply the window.
 *
 * Deliberately not "find the scrolling ancestor and read its scrollTop" — an
 * `overflow: auto` element whose content happens to fit is indistinguishable
 * from a real scroller at mount time, and guessing wrong reports the entire
 * list as visible.
 */
function useScrollViewport(
  ref: React.MutableRefObject<HTMLElement | null>
): Viewport {
  const [viewport, setViewport] = useState<Viewport>({ top: 0, height: 0 });

  const measure = useCallback(() => {
    const root = ref.current;
    if (root == null) return;

    const rootRect = root.getBoundingClientRect();
    const clip = findClippingAncestor(root);

    let visibleTop = 0;
    let visibleBottom = window.innerHeight;
    if (clip != null) {
      const rect = clip.getBoundingClientRect();
      visibleTop = Math.max(visibleTop, rect.top);
      visibleBottom = Math.min(visibleBottom, rect.bottom);
    }

    setViewport({
      top: Math.max(visibleTop - rootRect.top, 0),
      height: Math.max(visibleBottom - visibleTop, 0),
    });
  }, []);

  useEffect(() => {
    let frame: number | null = null;
    const onScroll = () => {
      if (frame != null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };

    measure();

    // Capture phase, so a scroll inside any bounded ancestor reaches us without
    // having to identify which element that is.
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onScroll);

    const observer = new ResizeObserver(onScroll);
    if (ref.current != null) observer.observe(ref.current);

    return () => {
      if (frame != null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, [measure]);

  return viewport;
}

function findClippingAncestor(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current != null) {
    const { overflowY } = window.getComputedStyle(current);
    if (overflowY !== "visible") return current;
    current = current.parentElement;
  }
  return null;
}
