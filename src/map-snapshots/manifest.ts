/** The snapshot manifest, read by the server.
 *
 * The renderer writes `manifest.json` beside the images; the page looks each
 * spec up in it, and shows the image only when the manifest has that exact key.
 * No manifest, no entry, a fetch that fails: the page renders its fallback, and
 * nothing else changes.
 *
 * Configured by `MACROSTRAT_MAP_SNAPSHOTS_URL` (read as
 * `VITE_MACROSTRAT_MAP_SNAPSHOTS_URL` on the server, like every runtime
 * setting). Unset, snapshots are off. It must be absolute — the server fetches
 * the manifest from it — e.g. the web-assets bucket's `map-snapshots/` prefix,
 * or `http://localhost:3000/map-snapshots` with a local render written to
 * `public/map-snapshots`.
 */
import { getRuntimeConfig } from "@macrostrat-web/settings";
import { mapSnapshotKey, type MapSnapshotSpec } from "./spec";

export interface MapSnapshotManifestEntry {
  width: number;
  height: number;
  /** Pixel ratio → file, relative to the snapshot base. */
  files: Record<string, string>;
  renderedAt: string;
}

export interface MapSnapshotManifest {
  version: 1;
  generatedAt: string;
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

/** How long the server trusts its copy. Snapshots are re-rendered on the order
 * of days; this only bounds how long a fresh render takes to show. */
const MANIFEST_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; manifest: MapSnapshotManifest | null } | null = null;

export function mapSnapshotBaseURL(): string | null {
  const base = getRuntimeConfig("MACROSTRAT_MAP_SNAPSHOTS_URL", null);
  if (base == null || base === "") return null;
  return base.replace(/\/+$/, "");
}

/** The manifest, or null when snapshots are off or it can't be read. Cached
 * for a few minutes, failures included, so a missing bucket costs one request
 * per interval rather than one per page view. */
export async function loadMapSnapshotManifest(): Promise<MapSnapshotManifest | null> {
  const base = mapSnapshotBaseURL();
  if (base == null) return null;
  if (cached != null && Date.now() - cached.at < MANIFEST_TTL_MS) {
    return cached.manifest;
  }

  let manifest: MapSnapshotManifest | null = null;
  try {
    const res = await fetch(`${base}/manifest.json`);
    if (res.ok) manifest = await res.json();
  } catch (err) {
    console.warn("[map-snapshots] manifest unavailable:", err?.message ?? err);
  }
  cached = { at: Date.now(), manifest };
  return manifest;
}

/** The image for a spec, if the manifest has one rendered from exactly this
 * spec. */
export function resolveMapSnapshot(
  manifest: MapSnapshotManifest | null,
  spec: MapSnapshotSpec
): MapSnapshotImage | null {
  const base = mapSnapshotBaseURL();
  if (manifest == null || base == null) return null;
  const entry = manifest.entries?.[mapSnapshotKey(spec)];
  if (entry == null) return null;

  const version = encodeURIComponent(entry.renderedAt);
  const urlFor = (ratio: number) =>
    `${base}/${entry.files[String(ratio)]}?v=${version}`;

  const ratios = spec.pixelRatios.filter((r) => entry.files[String(r)] != null);
  if (ratios.length === 0) return null;

  return {
    src: urlFor(ratios[0]),
    srcSet: ratios.map((r) => `${urlFor(r)} ${r}x`).join(", "),
    width: entry.width,
    height: entry.height,
    renderedAt: entry.renderedAt,
  };
}
