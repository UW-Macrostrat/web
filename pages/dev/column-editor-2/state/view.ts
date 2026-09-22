/** View state: which table is being edited, what is selected, which panes are
 * showing. None of it changes the column's data — it is all about what the
 * editor is pointed at — so it is kept apart from the transaction. */
import { atom } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import type { EditorSurface } from "../surfaces";
import { editedUnitsAtom } from "./column";
import { surfacesAtom } from "./surfaces";

/** `unified` is the [[column-ingestion]] `units` sheet: one row per unit
 * carrying its own boundaries, with no surfaces table because the format has
 * none — a surface there is just two units sharing a value. */
export type EditingMode = "units" | "surfaces" | "unified";

const modeParamAtom = atomWithSearchParam("mode");

/** Which table is being edited. Synced to `?mode=`, default kept out. */
export const editingModeAtom = atom(
  (get): EditingMode => {
    const raw = get(modeParamAtom);
    if (raw === "surfaces") return "surfaces";
    if (raw === "unified") return "unified";
    return "units";
  },
  (get, set, mode: EditingMode) => {
    let value: string | null = mode;
    if (mode === "units") value = null;
    set(modeParamAtom, value);
  }
);

/** A pane's visibility as a URL parameter, with the default kept out. */
function paneVisibilityAtom(key: string, defaultOpen: boolean) {
  const param = atomWithSearchParam(key);
  const closedValue = defaultOpen ? "0" : "1";
  return atom(
    (get) => (get(param) === closedValue ? !defaultOpen : defaultOpen),
    (get, set, open: boolean) => {
      let value: string | null = null;
      if (open !== defaultOpen) value = closedValue;
      set(param, value);
    }
  );
}

/** Whether the details pane is showing (`?details=0` closes it). */
export const inspectorOpenAtom = paneVisibilityAtom("details", true);

/** Whether the column graphic is showing (`?column=0` hides it). Hiding it
 * gives the sheet the whole window, which is what bulk table work wants. */
export const columnVisibleAtom = paneVisibilityAtom("column", true);

/* --------------------------------------------------------------- selection */

export const selectedUnitIDAtom = atom<number | null>(null);
export const selectedSurfaceIDAtom = atom<string | null>(null);

export const selectedUnitAtom = atom<UnitLong | null>((get) => {
  const id = get(selectedUnitIDAtom);
  if (id == null) return null;
  return get(editedUnitsAtom).find((u) => u.unit_id === id) ?? null;
});

export const selectedSurfaceAtom = atom<EditorSurface | null>((get) => {
  const id = get(selectedSurfaceIDAtom);
  if (id == null) return null;
  return get(surfacesAtom).find((s) => s.id === id) ?? null;
});
