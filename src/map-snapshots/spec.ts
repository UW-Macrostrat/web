/** Cached map views: a map rendered once, in headless Chromium inside the web
 * server, and served to every reader as an image until they ask for the live
 * one.
 *
 * Three pieces share this module, so they can't disagree about names:
 *
 * - **the snapshot route** (`/dev/map-snapshot/<kind>/<id>`), which renders one
 *   view with the same components the live page uses and reports when it has
 *   settled;
 * - **the store** (`store.server.ts`), which drives that route with Playwright
 *   when a still is missing or stale, and keeps the images and a manifest on
 *   disk;
 * - **the page** that shows the image, which asks the store for its spec.
 *
 * A snapshot is keyed by what it depends on. Change an area's camera, its age
 * filter or the hero's styling version and the key changes with it, so a page
 * never shows a picture of a view it no longer describes: it falls back until
 * the store has drawn the new one. A re-render of an unchanged view keeps its
 * key and replaces the file; the manifest's `renderedAt` busts the cache.
 *
 * Isomorphic: no browser or Node APIs here.
 *
 * Design notes live in the workbench feature area "Cached map views".
 */

/** One view to render. `params` is everything the image depends on besides its
 * size — it is hashed into the key, and never read otherwise. */
export interface MapSnapshotSpec {
  /** Which renderer draws it: `hero` for now. Also the first path segment. */
  kind: string;
  id: string;
  /** In CSS pixels. Each entry in `pixelRatios` is rendered at this size. */
  width: number;
  height: number;
  pixelRatios: number[];
  params: unknown;
}

export const MAP_SNAPSHOT_FORMAT = {
  mimeType: "image/webp",
  extension: "webp",
  quality: 0.85,
} as const;

/** The route that renders a spec, at the spec's own size. */
export function mapSnapshotRoute(spec: Pick<MapSnapshotSpec, "kind" | "id">) {
  return `/dev/map-snapshot/${spec.kind}/${spec.id}`;
}

/** The route listing every spec the site knows and whether the store has
 * drawn it. */
export const MAP_SNAPSHOT_INDEX_ROUTE = "/dev/map-snapshot";

/** A spec as the store and the index page handle it: its key and route
 * resolved. */
export interface MapSnapshotIndexEntry {
  kind: string;
  id: string;
  key: string;
  route: string;
  width: number;
  height: number;
  pixelRatios: number[];
}

export function mapSnapshotIndexEntry(
  spec: MapSnapshotSpec
): MapSnapshotIndexEntry {
  return {
    kind: spec.kind,
    id: spec.id,
    key: mapSnapshotKey(spec),
    route: mapSnapshotRoute(spec),
    width: spec.width,
    height: spec.height,
    pixelRatios: spec.pixelRatios,
  };
}

/** `hero/grand-canyon-970x450-1a2b3c4d`: readable, and different whenever
 * anything the image depends on is. */
export function mapSnapshotKey(spec: MapSnapshotSpec): string {
  const digest = hashString(stableStringify(spec.params));
  return `${spec.kind}/${spec.id}-${spec.width}x${spec.height}-${digest}`;
}

/** Where the web server serves stills from. */
export const MAP_SNAPSHOT_URL_PREFIX = "/map-snapshots";

/** Where one pixel ratio of a snapshot lives, relative to the snapshot base. */
export function mapSnapshotFile(key: string, pixelRatio: number): string {
  return `${key}@${pixelRatio}x.${MAP_SNAPSHOT_FORMAT.extension}`;
}

/** JSON with sorted keys, so two equal specs hash the same whatever order
 * their fields were written in. */
function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const entries = Object.keys(value)
    .sort()
    .filter((k) => value[k] !== undefined)
    .map((k) => JSON.stringify(k) + ":" + stableStringify(value[k]));
  return "{" + entries.join(",") + "}";
}

/** FNV-1a, 32 bits, as 8 hex digits. A cache key, not a signature: it only has
 * to change when its input does. */
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** The manifest the store keeps beside the images. Keyed by `mapSnapshotKey`. */
export interface MapSnapshotManifestEntry {
  width: number;
  height: number;
  /** Pixel ratio → file, relative to the snapshot directory. */
  files: Record<string, string>;
  renderedAt: string;
}

export interface MapSnapshotManifest {
  version: 1;
  entries: Record<string, MapSnapshotManifestEntry>;
}

/** What a page needs to draw a snapshot: an `<img>`'s attributes. */
export interface MapSnapshotImage {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  renderedAt: string;
}

/** Where a still stands in the store, for the index page. */
export type MapSnapshotState =
  | "ready"
  | "stale"
  | "queued"
  | "rendering"
  | "failed"
  | "missing";

export interface MapSnapshotStatus {
  entry: MapSnapshotIndexEntry;
  state: MapSnapshotState;
  renderedAt: string | null;
  error: string | null;
}
