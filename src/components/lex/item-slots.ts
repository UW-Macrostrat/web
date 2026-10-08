/** Sidebar slots for a lexicon item on the hybrid frame.
 *
 * The item's body works out its map and its settings together, but on the
 * frame the map belongs in the sidebar, a separate slot. The sidebar
 * registers an element per slot here and the body renders those parts into it
 * through a portal; without a sidebar (the content-only mode, or any page off
 * the frame) the body renders them inline as before.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import styles from "./item-slots.module.sass";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HybridMapPlacement } from "~/layouts/hybrid";
import { Icon } from "@blueprintjs/core";

const h = hyper.styled(styles);

export type LexSlotName = "map";

/** Set inside a lexicon item's hybrid frame, where the map shows only in a
 * slot the frame offers (the sidebar, or the map floated on request) */
export const lexOnHybridFrameAtom = atom(false);

const NO_COLUMNS_TEXT = "Found in no columns";

/** False once the item's columns have loaded and there are none to map */
export const lexMapAvailableAtom = atom(true);

/** Where the item's map goes in the details-only view, if it has one */
export function LexMapPlacement() {
  const available = useAtomValue(lexMapAvailableAtom);
  return h(HybridMapPlacement, {
    available,
    unavailableReason: NO_COLUMNS_TEXT,
  });
}

const slotElementsAtom = atom<Partial<Record<LexSlotName, HTMLElement>>>({});

const setSlotElementAtom = atom(
  null,
  (get, set, name: LexSlotName, element: HTMLElement | null) => {
    const prev = get(slotElementsAtom);
    if ((prev[name] ?? null) === element) return;
    set(slotElementsAtom, { ...prev, [name]: element ?? undefined });
  }
);

/** An empty element in the frame's sidebar for the body to render into */
export function LexSidebarSlot({
  name,
  className,
}: {
  name: LexSlotName;
  className?: string;
}) {
  const setElement = useSetAtom(setSlotElementAtom);
  const ref = useCallback(
    (element: HTMLElement | null) => setElement(name, element),
    [name, setElement]
  );
  // An item with nothing to map says so where its map would be. The body
  // renders nothing into the slot then, so the note doesn't share it.
  const available = useAtomValue(lexMapAvailableAtom);
  const unavailable = name == "map" && !available;
  let note = null;
  if (unavailable) {
    note = h("div.no-map-note", [
      h(Icon, { icon: "map", size: 14 }),
      NO_COLUMNS_TEXT,
    ]);
  }
  return h(
    "div.lex-sidebar-slot",
    { ref, className: classNames(className, `slot-${name}`, { unavailable }) },
    note
  );
}

/** Whether the frame's sidebar is showing this slot */
export function useLexSlotElement(name: LexSlotName): HTMLElement | null {
  return useAtomValue(slotElementsAtom)[name] ?? null;
}

/** Renders its children into the named sidebar slot, or in place without one */
export function LexSlotPortal({
  name,
  children,
}: {
  name: LexSlotName;
  children: ReactNode;
}) {
  const element = useLexSlotElement(name);
  if (element == null) return h([children]);
  return createPortal(children, element);
}
