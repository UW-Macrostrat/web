/** The registry of editing-session stores, one per column.
 *
 * Kept apart from the seeding code (`./session`) so the column layout can
 * import it — with the editor's isolated provider (`./ctx`) — without
 * pulling in the editor's state graph, which is not server-safe. This file
 * depends on jotai alone. */
import { createStore } from "jotai";

export type EditorStore = ReturnType<typeof createStore>;

const sessions = new Map<string, EditorStore>();

/** The session store for a column, made on first use and kept for the life
 * of the tab. On the server every render gets a fresh store: a module-level
 * map there would be shared between requests. */
export function getEditSession(key: string): EditorStore {
  if (typeof window === "undefined") return createStore();
  let store = sessions.get(key);
  if (store == null) {
    store = createStore();
    sessions.set(key, store);
  }
  return store;
}

/** Forget a column's session — after a successful write, or to start over. */
export function dropEditSession(key: string) {
  sessions.delete(key);
}

export function sessionKeyFor(col_id: number | string | null | undefined): string {
  if (col_id == null) return "draft";
  return String(col_id);
}
