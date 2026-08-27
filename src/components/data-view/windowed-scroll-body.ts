/** A windowed (virtualized) scroll body for `@macrostrat/data-sheet`'s
 * `DataPanel`, with two levels of group header.
 *
 * `DataPanel` hands its `scrollBody` the *already-created* card elements and
 * keeps ownership of the scroll container, so windowing is purely a rendering
 * concern here. Rows are laid out in **normal flow between two spacers** rather
 * than absolutely positioned — that costs a little offset arithmetic but is
 * what makes `position: sticky` headers possible at all.
 *
 * Two grouping levels, handled differently because their sizes differ by orders
 * of magnitude:
 *
 *  - **`groupOf`** (inner; column groups — median ~15 rows) renders a sticky
 *    header in flow. The window start is snapped back to the enclosing header
 *    so it is always mounted, which costs at most one group's worth of extra
 *    rows.
 *  - **`sectionOf`** (outer; projects — up to ~1700 rows) can't use that trick:
 *    snapping back that far would defeat the windowing. It renders a section
 *    header in flow *plus* an always-mounted sticky context bar naming whatever
 *    section you're currently inside, so the outer context never disappears.
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
  /** Fixed height of one card, in px. Rows are positioned by arithmetic, so
   * this has to match the card's own styling. */
  rowHeight: number;
  /** Inner grouping — a sticky header, always kept in the window. */
  groupOf?: (row: T) => RowGroup | null;
  groupHeight?: number;
  /** Outer grouping — shown *only* in the sticky context bar, which is always
   * mounted. Sections deliberately get no in-flow header: the bar already names
   * the section you're inside, and a second marker was a duplicate. */
  sectionOf?: (row: T) => RowGroup | null;
  /** Height of the sticky context bar. */
  sectionHeight?: number;
  /** Extra rows rendered above and below the viewport. */
  overscan?: number;
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
    groupOf,
    groupHeight = rowHeight,
    sectionOf,
    sectionHeight = rowHeight,
    overscan = 8,
  } = options;

  return function WindowedScrollBody({ children }: ScrollBodyProps) {
    const rows = useSelector<T, T[]>((state) => state.data) ?? [];
    const cards = useMemo(() => Children.toArray(children), [children]);

    const rootRef = useRef<HTMLDivElement | null>(null);
    const viewport = useScrollViewport(rootRef);

    const nonNullRows = useMemo(() => rows.filter((r) => r != null), [rows]);

    const items = useMemo(
      () =>
        buildItems(nonNullRows, {
          groupOf,
          groupHeight,
          sectionOf,
          sectionHeight,
          rowHeight,
        }),
      [nonNullRows]
    );

    // During a load the panel appends skeleton cards, so the card list and the
    // row list disagree. Windowing on a mismatched mapping would show the wrong
    // rows, so fall back to plain rendering for that transient window.
    const aligned = cards.length === nonNullRows.length;

    if (!aligned || items.length === 0) {
      return h(
      "div.windowed-root",
      {
        ref: rootRef,
        style: { "--windowed-context-height": `${sectionHeight}px` } as any,
      },
      [
        h("div.windowed-body.unwindowed", cards),
      ]);
    }

    const last = items[items.length - 1];
    const totalHeight = last.top + last.height;

    let [start, end] = visibleRange(items, viewport, overscan, rowHeight);
    // Snap back to the enclosing inner-group header so it stays mounted, and
    // therefore stays stuck to the top of the viewport.
    start = snapToGroupHeader(items, start);

    const topSpacer = items[start].top;
    const bottomSpacer = Math.max(
      totalHeight - (items[end - 1].top + items[end - 1].height),
      0
    );

    const rendered: ReactNode[] = [];
    for (let i = start; i < end; i++) {
      const item = items[i];
      if (item.type === "row") {
        rendered.push(
          h(
            "div.windowed-row",
            { key: `row-${item.cardIndex}`, style: { height: item.height } },
            cards[item.cardIndex]
          )
        );
        continue;
      }
      rendered.push(
        h(
          `div.windowed-${item.type}-header`,
          {
            key: `${item.type}-${item.group.key}-${item.top}`,
            style: { height: item.height },
          },
          item.group.label
        )
      );
    }

    const section = firstVisibleSection(items, start, nonNullRows, sectionOf);

    return h(
      "div.windowed-root",
      {
        ref: rootRef,
        style: { "--windowed-context-height": `${sectionHeight}px` } as any,
      },
      [
      h.if(section != null)(
        "div.windowed-context-bar",
        { key: "context", style: { height: sectionHeight } },
        section?.label
      ),
      h("div.windowed-body", { key: "body" }, [
        h("div.windowed-spacer", { key: "top", style: { height: topSpacer } }),
        ...rendered,
        h("div.windowed-spacer", {
          key: "bottom",
          style: { height: bottomSpacer },
        }),
      ]),
      ]
    );
  };
}

function buildItems<T>(
  rows: T[],
  cfg: {
    groupOf?: (row: T) => RowGroup | null;
    groupHeight: number;
    sectionOf?: (row: T) => RowGroup | null;
    sectionHeight: number;
    rowHeight: number;
  }
): Item[] {
  const items: Item[] = [];
  let top = 0;
  let lastSection: string | number | null = null;
  let lastGroup: string | number | null = null;

  rows.forEach((row, cardIndex) => {
    const section = cfg.sectionOf?.(row) ?? null;
    if (section != null && section.key !== lastSection) {
      lastSection = section.key;
      // A new section restarts inner grouping, so its first group always gets a
      // header even if the key repeats across sections.
      lastGroup = null;
    }

    const group = cfg.groupOf?.(row) ?? null;
    if (group != null && group.key !== lastGroup) {
      items.push({ type: "group", group, top, height: cfg.groupHeight });
      top += cfg.groupHeight;
      lastGroup = group.key;
    }

    items.push({ type: "row", cardIndex, top, height: cfg.rowHeight });
    top += cfg.rowHeight;
  });

  return items;
}

/** Walk back to the nearest inner-group header at or before `index`, so it is
 * inside the rendered window. Bounded by the previous section boundary. */
function snapToGroupHeader(items: Item[], index: number): number {
  for (let i = index; i >= 0; i--) {
    if (items[i].type === "group") return i;
  }
  return 0;
}

/** The section the first rendered row belongs to — the context bar's content.
 * Read off the row rather than from a laid-out header, since sections
 * deliberately don't occupy a row: the bar is their single representation. */
function firstVisibleSection<T>(
  items: Item[],
  index: number,
  rows: T[],
  sectionOf?: (row: T) => RowGroup | null
): RowGroup | null {
  if (sectionOf == null) return null;
  for (let i = index; i < items.length; i++) {
    const item = items[i];
    if (item.type === "row") return sectionOf(rows[item.cardIndex]);
  }
  return null;
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
 * *clipping* ancestor, which covers a bounded pane and the document alike
 * without needing to know which is in play. Deliberately not "find the
 * scrolling ancestor and read its scrollTop" — an `overflow: auto` element
 * whose content happens to fit is indistinguishable from a real scroller at
 * mount time, and guessing wrong reports the entire list as visible.
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
