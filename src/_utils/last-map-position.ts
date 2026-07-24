import { atomWithStorage } from "jotai/utils";
import type { MapPosition } from "@macrostrat/mapbox-utils";

/**
 * Shared "last-viewed map location", persisted to localStorage under a single
 * key and synced across ALL map pages (main `/map`, `/dev/map/topology`, …). Head
 * to a location on one map, switch to another, and it carries through.
 *
 * Stored with a timestamp so a stale position (older than {@link MAX_AGE_MS}) is
 * ignored — "resume where I left off" should reflect a recent session, not a
 * location from weeks ago. When ignored, the caller falls through to its next
 * default sink (GeoIP / hard-coded).
 *
 * Two entry points on the same key + envelope:
 *  - imperative {@link readLastMapPosition} / {@link writeLastMapPosition} for
 *    non-jotai stores (the `/map` zustand store)
 *  - {@link lastMapPositionAtom} for jotai-based pages (topology)
 */

const KEY = "macrostrat:map:last-position";

/** Ignore a saved position older than a day. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredPosition {
  position: MapPosition;
  timestamp: number;
}

/** Read the stored position, or null if absent, malformed, or stale. */
function readFresh(): MapPosition | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const stored = JSON.parse(raw) as StoredPosition;
    if (stored?.position == null || typeof stored.timestamp !== "number") {
      return null;
    }
    if (Date.now() - stored.timestamp > MAX_AGE_MS) return null;
    return stored.position;
  } catch {
    return null;
  }
}

export function readLastMapPosition(): MapPosition | null {
  return readFresh();
}

export function writeLastMapPosition(position: MapPosition | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (position == null) {
      localStorage.removeItem(KEY);
      return;
    }
    const stored: StoredPosition = { position, timestamp: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Storage disabled or over quota — last-viewed is best-effort.
  }
}

// Custom jotai storage so the atom shares the exact key + timestamp envelope +
// staleness rule as the imperative API above, plus cross-tab sync.
const storage = {
  getItem: (_key: string, initialValue: MapPosition | null) =>
    readFresh() ?? initialValue,
  setItem: (_key: string, value: MapPosition | null) =>
    writeLastMapPosition(value),
  removeItem: () => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  },
  subscribe: (
    _key: string,
    callback: (value: MapPosition | null) => void,
    initialValue: MapPosition | null
  ) => {
    if (typeof window === "undefined") return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      callback(readFresh() ?? initialValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

/** jotai mirror of the shared last-viewed position, for jotai-based map pages. */
export const lastMapPositionAtom = atomWithStorage<MapPosition | null>(
  KEY,
  null,
  storage,
  { getOnInit: true }
);
