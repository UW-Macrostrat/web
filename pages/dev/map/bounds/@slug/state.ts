/** Page state. `HybridPage` makes its own jotai scope, so the loaded
 * boundary and operation types are seeded through `initialAtoms`. */
import { atom, useAtomValue, useSetAtom } from "jotai";
import type { Geometry } from "geojson";
import { useCallback } from "react";
import type { BuildReport, MapBoundary, OperationType } from "./api";

export const boundaryAtom = atom<MapBoundary | null>(null);
export const operationTypesAtom = atom<OperationType[]>([]);

/** The polygon being drawn, before it is saved as `add` or `subtract`. */
export const draftAtom = atom<Geometry | null>(null);
export const drawingAtom = atom(false);

/** The operation picked in the list: shows its controls, and a drawn one's
 * polygon goes into the draw control for editing. */
export const selectedOpIdAtom = atom<number | null>(null);
export const selectedOpAtom = atom((get) => {
  const id = get(selectedOpIdAtom);
  return get(boundaryAtom)?.operations.find((o) => o.id === id) ?? null;
});
/** The selected polygon as edited and not yet saved; null when unchanged. */
export const editedGeometryAtom = atom<Geometry | null>(null);

/** Reorder mode: rows are dragged, not selected. */
export const reorderingAtom = atom(false);

/** Select an operation (or nothing), dropping any draft or unsaved edit. */
export const selectOpAtom = atom(null, (get, set, id: number | null) => {
  set(selectedOpIdAtom, id);
  set(editedGeometryAtom, null);
  set(draftAtom, null);
  set(drawingAtom, false);
});

/** Draw the map's own polygons and lines under the boundary. */
export const showDataAtom = atom(false);

/** Bumped after a written build, so the boundary tiles are fetched afresh. */
export const tileVersionAtom = atom(0);

export const busyAtom = atom(false);
export const errorAtom = atom<string | null>(null);
export const buildReportAtom = atom<BuildReport | null>(null);

/** Run an edit against the map's slug; its result replaces the boundary.
 * Errors are kept for the panel rather than thrown. Resolves true on success. */
export function useBoundaryEdit() {
  const boundary = useAtomValue(boundaryAtom);
  const setBoundary = useSetAtom(boundaryAtom);
  const setBusy = useSetAtom(busyAtom);
  const setError = useSetAtom(errorAtom);
  const setReport = useSetAtom(buildReportAtom);
  const slug = boundary?.slug;

  return useCallback(
    async (edit: (slug: string) => Promise<MapBoundary>) => {
      if (slug == null) return false;
      setBusy(true);
      setError(null);
      try {
        setBoundary(await edit(slug));
        // A preview no longer describes the edited list
        setReport(null);
        return true;
      } catch (err) {
        setError(String((err as Error)?.message ?? err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [slug, setBoundary, setBusy, setError, setReport]
  );
}
