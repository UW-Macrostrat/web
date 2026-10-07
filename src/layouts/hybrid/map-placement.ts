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
import { createContext, useContext, useEffect, type ReactNode } from "react";

import h from "./map-placement.module.sass";
import {
  floatingMapOpenAtom,
  hasMapPane,
  layoutModeAtom,
  mapPlacementCountAtom,
} from "./state";

/** The page's `map` slot, for placements inside its content */
export const HybridMapContext = createContext<ReactNode>(null);

export function HybridMapPlacement({ className }: { className?: string }) {
  const map = useContext(HybridMapContext);
  const mode = useAtomValue(layoutModeAtom);
  const [open, setOpen] = useAtom(floatingMapOpenAtom);
  useRegisterPlacement();

  // With a map pane (the sidebar, an inset), the map is already on screen
  if (map == null || hasMapPane(mode)) return null;

  if (!open) {
    return h(
      "div.map-placement.closed",
      { className },
      h(Button, {
        large: true,
        minimal: true,
        icon: "map",
        text: "Show map",
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
  return h("div.map-placement.open", { className: classNames(className) }, [
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

function useRegisterPlacement() {
  const setCount = useSetAtom(mapPlacementCountAtom);
  useEffect(() => {
    setCount((count) => count + 1);
    return () => setCount((count) => count - 1);
  }, [setCount]);
}
