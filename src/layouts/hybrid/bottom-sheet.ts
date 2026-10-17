/** A sheet docked at the foot of the content shell, below its scroll region
 * rather than over it: the region gives up the height the sheet takes, so the
 * page's end (its footer) stays reachable and a selection scrolled to the
 * middle of the region stays in view. */
import { useAtomValue, useSetAtom } from "jotai";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import h from "./composer.module.sass";
import { bottomSheetElementAtom } from "./state";

/** Where the shell puts the sheet; empty, and so hidden, without one */
export function BottomSheetSlot() {
  const setElement = useSetAtom(bottomSheetElementAtom);
  return h("div.bottom-sheet-slot", { ref: setElement });
}

/** Renders its children in the docked sheet. Nothing outside the content
 * shell, which is the only one with the slot. */
export function HybridBottomSheet({ children }: { children: ReactNode }) {
  const element = useAtomValue(bottomSheetElementAtom);
  if (element == null) return null;
  return createPortal(children, element);
}
