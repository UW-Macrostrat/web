/** The editing session: one store per column, shared by its pages.
 *
 * Overview, units and location are separate routes, each in its own frame,
 * but they edit one column, and a person expects to move between them
 * without losing anything and to save or revert the lot at once. So the
 * editor's atoms live in a store keyed by the column, held at module level
 * for the life of the tab, and the column layout mounts the editor's
 * isolated provider with it (`./ctx`). A new column (`/columns/new`) gets a
 * fresh, unkeyed store per visit.
 *
 * Seeding is idempotent: the loaded column is written once per session, so
 * returning to a page does not wipe the transaction; a different column
 * starts a different session. */
import type { ColumnEditorData } from "../data";
import { snapshotAtom } from "./column";
import { faciesSchemeAtom, noticesAtom } from "./ingest";
import { loadedFootprintAtom, footprintAtom } from "./location";
import { footprintFromColumn } from "../location/geometry";
import type { EditorStore } from "./session-store";

export * from "./session-store";

/** Seed a session with a loaded column, unless it already holds it. The
 * snapshot is identity: a session holding a snapshot for the same column
 * keeps its transaction. Notices and the facies scheme refresh whenever the
 * data carries them. */
export function seedEditSession(store: EditorStore, data: ColumnEditorData) {
  const current = store.get(snapshotAtom);
  const same =
    current != null &&
    current.col_id === data.col_id &&
    current.col_id != null &&
    current.source === data.source;
  if (!same) {
    const { col_id, columnInfo, units, boundaries, isDraft, source } = data;
    store.set(snapshotAtom, { col_id, columnInfo, units, boundaries, isDraft, source });
    const footprint = footprintFromColumn(columnInfo, data.region ?? null);
    store.set(loadedFootprintAtom, footprint);
    store.set(footprintAtom, footprint);
  }
  if (data.notices != null) store.set(noticesAtom, data.notices);
  if (data.facies != null) store.set(faciesSchemeAtom, data.facies);
}
