/** Sidebar slots for a lexicon item on the hybrid frame.
 *
 * The item's body works out its map, settings and sources together, but on the
 * frame the map and sources belong in the sidebar, a separate slot. The sidebar
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

const h = hyper.styled(styles);

export type LexSlotName = "map" | "assistant";

/** Set inside a lexicon item's hybrid frame, where the map shows only in a
 * slot the frame offers (the sidebar, or the map floated on request) */
export const lexOnHybridFrameAtom = atom(false);

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
  return h("div.lex-sidebar-slot", {
    ref,
    className: classNames(className, `slot-${name}`),
  });
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
