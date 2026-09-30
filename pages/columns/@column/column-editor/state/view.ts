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

/** Which table is being edited: the unified sheet unless another is asked
 * for. Synced to `?mode=`, default kept out. */
export const editingModeAtom = atom(
  (get): EditingMode => {
    const raw = get(modeParamAtom);
    if (raw === "surfaces") return "surfaces";
    if (raw === "units") return "units";
    return "unified";
  },
  (get, set, mode: EditingMode) => {
    let value: string | null = mode;
    if (mode === "unified") value = null;
    set(modeParamAtom, value);
  }
);

/** How the sheets present their values.
 *
 * - `rich` — the guided editor: entities as tags, picked through the
 *   vocabulary pickers; an interval and the proportion within it as one
 *   position; derived and restated values drawn as such.
 * - `plain` — the spreadsheet: every value as the [[column-ingestion]]
 *   template writes it, one field per cell, typed and pasted as text — for
 *   copying to and from the template. What can't be resolved is flagged, not
 *   refused.
 */
export type SheetView = "rich" | "plain";

const viewParamAtom = atomWithSearchParam("view");

/** The sheets' presentation: rich unless `?view=plain`. */
export const sheetViewAtom = atom(
  (get): SheetView => {
    if (get(viewParamAtom) === "plain") return "plain";
    return "rich";
  },
  (get, set, view: SheetView) => {
    let value: string | null = null;
    if (view === "plain") value = "plain";
    set(viewParamAtom, value);
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

/** Whether the table is showing (`?sheet=0` hides it). With it hidden the
 * details pane's row editor is the way to edit — the same fields, one record
 * at a time, with the column taking the room. */
export const sheetVisibleAtom = paneVisibilityAtom("sheet", true);

/* ------------------------------------------------------------------ mode */

/** Whether this is the editor (`/columns/:id/edit`) or the same interface
 * read-only (`/columns/:id/table`). Seeded by the route through the frame's
 * `initialAtoms`; nothing in the page changes it. Every write path reads it:
 * the sheets' `editable`, the row editor, the transaction actions. */
export const editModeAtom = atom<boolean>(false);

/** Whether the column graphic is showing (`?column=0` hides it). Hiding it
 * gives the sheet the whole window, which is what bulk table work wants. */
export const columnVisibleAtom = paneVisibilityAtom("column", true);

/* ------------------------------------------------------------- column tool */

/** What a click on the column does: select the unit or surface under it, or
 * put a new surface there — splitting the unit it falls in, or extending the
 * column to it with an empty unit. Page state: a tool, not a view. */
export type ColumnTool = "select" | "add-surface";

export const columnToolAtom = atom<ColumnTool>("select");

/** The column coordinate under the pointer (an age, or a position on a
 * measured column), as the column reports it, with the screen position it was
 * read at and what one pixel spans there — estimated from successive readings,
 * so it follows each section's own scale. Written as the pointer moves and
 * read only when the column is clicked, so nothing re-renders with it. */
export interface HoveredCoordinate {
  value: number;
  clientY: number;
  perPixel: number | null;
}

export const hoveredCoordinateAtom = atom<HoveredCoordinate | null>(null);

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
