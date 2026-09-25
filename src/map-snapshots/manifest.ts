/** The snapshot manifest, read by the server.
 *
 * The renderer writes `manifest.json` beside the images; the page looks each
 * spec up in it, and shows the image only when the manifest has that exact key.
 * No manifest, no entry, a fetch that fails: the page renders its fallback, and
 * nothing else changes.
 *
 * Configured by `MACROSTRAT_MAP_SNAPSHOTS_URL` (read as
 * `VITE_MACROSTRAT_MAP_SNAPSHOTS_URL` on the server, like every runtime
 * setting). Unset, snapshots are off. Two forms:
 *
 * - **Absolute** — the bucket's `map-snapshots/` prefix, e.g.
 *   `https://storage.macrostrat.org/assets/web/map-snapshots`. The server
 *   fetches the manifest from it, and caches it for a few minutes.
 * - **Relative** — `/map-snapshots`, for a local render (`yarn
 *   snapshots:local`) into `public/map-snapshots`. The browser loads the images
 *   from whatever origin served the page, and the server reads the manifest
 *   from disk on every request, so a fresh render shows on reload.
 */
import { getRuntimeConfig } from "@macrostrat-web/settings";
import {
  mapSnapshotKey,
  type MapSnapshotManifest,
  type MapSnapshotSpec,
} from "@macrostrat-web/map-snapshots";

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

/** Where a relative snapshot URL's files are: Vite serves `public/` at `/`. */
const PUBLIC_DIR = "public";

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
  if (base.startsWith("/")) return readLocalManifest(base);
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

async function readLocalManifest(base: string): Promise<MapSnapshotManifest | null> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const path = join(process.cwd(), PUBLIC_DIR, base, "manifest.json");
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    // Nothing rendered locally yet.
    return null;
  }
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
