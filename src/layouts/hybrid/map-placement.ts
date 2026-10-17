/** Where a page's map appears in the modes without a map pane of its own.
 *
 * The best spot for an inline map depends on the content, so a page places it:
 * `HybridMapPlacement` in the content renders a "Show map" placeholder, and the
 * map itself once asked for. A page that places none gets "Show map" in the
 * view menu, and the frame floats the map at the top of the content.
 */
import { Button } from "@blueprintjs/core";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import classNames from "classnames";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

import h from "./map-placement.module.sass";
import {
  floatingMapOpenAtom,
  hasMapPane,
  layoutModeAtom,
  mapPlacementCountAtom,
} from "./state";

/** The page's `map` slot, for placements inside its content */
export const HybridMapContext = createContext<ReactNode>(null);

export function HybridMapPlacement({
  className,
  available = true,
  unavailableReason,
}: {
  className?: string;
  /** False when the page has nothing to map: the placeholder stays, greyed
   * out, and the placement keeps the frame from offering a map of its own */
  available?: boolean;
  /** Why there's no map, as the disabled placeholder's tooltip */
  unavailableReason?: string;
}) {
  const map = useContext(HybridMapContext);
  const mode = useAtomValue(layoutModeAtom);
  const [open, setOpen] = useAtom(floatingMapOpenAtom);
  useRegisterPlacement();

  // With a map pane (the sidebar, an inset), the map is already on screen
  if (map == null || hasMapPane(mode)) return null;

  if (!open || !available) {
    let title: string | undefined = undefined;
    if (!available) title = unavailableReason;
    return h(
      "div.map-placement.closed",
      // On the box: a disabled button shows no tooltip of its own
      { className: classNames(className, { unavailable: !available }), title },
      h(Button, {
        large: true,
        minimal: true,
        icon: "map",
        text: "Show map",
        disabled: !available,
        onClick: () => setOpen(true),
      })
    );
  }
  return h(FloatingMapPanel, { className }, map);
}

/** The map, floated at the top right of whatever contains it so the content's
 * text wraps beside and below it, with a button to put it away. */
export function FloatingMapPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const setOpen = useSetAtom(floatingMapOpenAtom);
  const ref = useRef<HTMLDivElement>(null);
  useCloseWhenScrolledPast(ref);
  return h("div.map-placement.open", { className: classNames(className), ref }, [
    children,
    h(Button, {
      className: "map-placement-close",
      icon: "cross",
      small: true,
      title: "Hide map",
      onClick: () => setOpen(false),
    }),
  ]);
}

/** Brings the map into view as it opens (from a header button, the reader
 * may be far down the page), and puts it away once it has scrolled off the
 * top. The content below holds still as the map's space closes up — by hand,
 * since not every browser anchors scrolling (Safari doesn't). */
function useCloseWhenScrolledPast(ref: RefObject<HTMLDivElement>) {
  const setOpen = useSetAtom(floatingMapOpenAtom);
  useEffect(() => {
    const element = ref.current;
    if (element == null) return;
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Not before it has been seen, or the scroll to it would close it
    let seen = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) seen = true;
      // Gone above the viewport, not merely below it
      if (!seen || entry.isIntersecting) return;
      if (entry.boundingClientRect.bottom > 0) return;
      const anchor = element.nextElementSibling;
      const scroller = scrollParent(element);
      const before = anchor?.getBoundingClientRect().top;
      flushSync(() => setOpen(false));
      const after = anchor?.getBoundingClientRect().top;
      if (scroller == null || before == null || after == null) return;
      scroller.scrollTop += after - before;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [setOpen]);
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node != null) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY == "auto" || overflowY == "scroll") return node;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
}

function useRegisterPlacement() {
  const setCount = useSetAtom(mapPlacementCountAtom);
  useEffect(() => {
    setCount((count) => count + 1);
    return () => setCount((count) => count - 1);
  }, [setCount]);
}
