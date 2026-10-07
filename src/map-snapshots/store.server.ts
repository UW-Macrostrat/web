/** The web server's store of cached map views: stills on disk, drawn by the
 * server itself when a page asks for one it doesn't have.
 *
 * A page resolves its specs here (`resolveMapSnapshots`). What is on disk and
 * current comes back as `<img>` attributes; what is missing or older than the
 * maximum age is queued, and drawn in the background by headless Chromium
 * loading this same server's snapshot route. No reader ever waits on a render:
 * the page that found a still missing shows its fallback, and the next one
 * gets the still.
 *
 * One view renders at a time, in one browser that is launched for a batch and
 * closed after it, so nothing stays resident between batches. A view that
 * fails isn't retried for a while; with no browser at all the store stops
 * asking until the server restarts.
 *
 * Settings — plain environment variables, read on the server only:
 *
 * | Variable                     | Default                          |
 * | ---------------------------- | -------------------------------- |
 * | `MAP_SNAPSHOTS_RENDER`       | on; `false` turns rendering off  |
 * | `MAP_SNAPSHOTS_DIR`          | `.cache/map-snapshots`           |
 * | `MAP_SNAPSHOTS_MAX_AGE_DAYS` | `7`                              |
 * | `MAP_SNAPSHOTS_SITE_URL`     | `http://127.0.0.1:$PORT`         |
 * | `MAP_SNAPSHOTS_TIMEOUT_MS`   | `120000` per view                |
 * | `CHROMIUM_PATH`              | Playwright's, then Google Chrome |
 *
 * With rendering off, stills already on disk are still served.
 */
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Browser } from "playwright-core";
import { captureMapSnapshot, launchSnapshotBrowser } from "./render.server";
import {
  MAP_SNAPSHOT_URL_PREFIX,
  mapSnapshotFile,
  mapSnapshotIndexEntry,
  type MapSnapshotImage,
  type MapSnapshotIndexEntry,
  type MapSnapshotManifest,
  type MapSnapshotSpec,
  type MapSnapshotState,
  type MapSnapshotStatus,
} from "./spec";

/** How long a failed view waits before it is tried again. */
const FAILURE_BACKOFF_MS = 15 * 60 * 1000;

interface StoreConfig {
  renderEnabled: boolean;
  dir: string;
  maxAgeMs: number;
  siteURL: string;
  timeoutMs: number;
  chromiumPath?: string;
}

export function mapSnapshotConfig(): StoreConfig {
  const env = process.env;
  const port = env.PORT ?? "3000";
  return {
    renderEnabled: !["false", "0", "off"].includes(
      (env.MAP_SNAPSHOTS_RENDER ?? "").toLowerCase()
    ),
    dir: resolve(process.cwd(), env.MAP_SNAPSHOTS_DIR ?? ".cache/map-snapshots"),
    maxAgeMs: Number(env.MAP_SNAPSHOTS_MAX_AGE_DAYS ?? 7) * 86_400_000,
    siteURL: (env.MAP_SNAPSHOTS_SITE_URL ?? `http://127.0.0.1:${port}`).replace(/\/+$/, ""),
    timeoutMs: Number(env.MAP_SNAPSHOTS_TIMEOUT_MS ?? 120_000),
    chromiumPath: env.CHROMIUM_PATH || undefined,
  };
}

interface StoreState {
  manifest: MapSnapshotManifest | null;
  queue: Map<string, MapSnapshotIndexEntry>;
  rendering: string | null;
  failures: Map<string, { at: number; error: string }>;
  /** Why rendering stopped for good, when there is no browser to render with. */
  unavailable: string | null;
}

/** One store per process. The server entry and the pages' data hooks are
 * bundled separately, so a module-level variable could exist twice. */
function store(): StoreState {
  const g = globalThis as any;
  g.__macrostratMapSnapshotStore ??= {
    manifest: null,
    queue: new Map(),
    rendering: null,
    failures: new Map(),
    unavailable: null,
  } satisfies StoreState;
  return g.__macrostratMapSnapshotStore;
}

/** The stills for a set of specs, in order — null where there is none yet.
 * Anything missing or stale is queued. `complete` says these are *all* the
 * specs of their kind, so stills of that kind under other keys (views that
 * have since changed) can be deleted. */
export async function resolveMapSnapshots(
  specs: MapSnapshotSpec[],
  { complete = false }: { complete?: boolean } = {}
): Promise<(MapSnapshotImage | null)[]> {
  const config = mapSnapshotConfig();
  const manifest = await loadManifest(config);
  const entries = specs.map(mapSnapshotIndexEntry);

  const images = entries.map((entry) => {
    const record = manifest.entries[entry.key];
    if (record == null || isStale(record.renderedAt, config)) enqueue(entry, config);
    if (record == null) return null;
    return imageFor(entry, record);
  });

  if (complete) await prune(entries, config);
  drain(config);
  return images;
}

/** Where each spec stands, for the snapshot index page. */
export async function mapSnapshotStatuses(
  specs: MapSnapshotSpec[]
): Promise<MapSnapshotStatus[]> {
  const config = mapSnapshotConfig();
  const manifest = await loadManifest(config);
  const state = store();
  return specs.map(mapSnapshotIndexEntry).map((entry) => {
    const record = manifest.entries[entry.key];
    const failure = state.failures.get(entry.key);
    let status: MapSnapshotState = "missing";
    if (record != null) status = "ready";
    if (record != null && isStale(record.renderedAt, config)) status = "stale";
    if (state.queue.has(entry.key)) status = "queued";
    if (state.rendering === entry.key) status = "rendering";
    if (record == null && failure != null) status = "failed";
    return {
      entry,
      state: status,
      renderedAt: record?.renderedAt ?? null,
      error: failure?.error ?? state.unavailable,
    };
  });
}

/** The directory the server entry serves at `MAP_SNAPSHOT_URL_PREFIX`. */
export function mapSnapshotDir(): string {
  return mapSnapshotConfig().dir;
}

function imageFor(
  entry: MapSnapshotIndexEntry,
  record: MapSnapshotManifest["entries"][string]
): MapSnapshotImage | null {
  const ratios = entry.pixelRatios.filter((r) => record.files[String(r)] != null);
  if (ratios.length === 0) return null;
  const version = encodeURIComponent(record.renderedAt);
  const urlFor = (ratio: number) =>
    `${MAP_SNAPSHOT_URL_PREFIX}/${record.files[String(ratio)]}?v=${version}`;
  return {
    src: urlFor(ratios[0]),
    srcSet: ratios.map((r) => `${urlFor(r)} ${r}x`).join(", "),
    width: record.width,
    height: record.height,
    renderedAt: record.renderedAt,
  };
}

function isStale(renderedAt: string, config: StoreConfig): boolean {
  return Date.now() - Date.parse(renderedAt) > config.maxAgeMs;
}

function enqueue(entry: MapSnapshotIndexEntry, config: StoreConfig) {
  const state = store();
  if (!config.renderEnabled || state.unavailable != null) return;
  if (state.queue.has(entry.key) || state.rendering === entry.key) return;
  const failure = state.failures.get(entry.key);
  if (failure != null && Date.now() - failure.at < FAILURE_BACKOFF_MS) return;
  state.queue.set(entry.key, entry);
}

/** Works through the queue, one view at a time, in one browser. Returns at
 * once; the work happens in the background. */
function drain(config: StoreConfig) {
  const state = store();
  if (state.rendering != null || state.queue.size === 0) return;
  state.rendering = "starting";
  renderQueue(config)
    .catch((err) => {
      console.error("[map-snapshots] renderer stopped:", err?.message ?? err);
    })
    .finally(() => {
      state.rendering = null;
    });
}

async function renderQueue(config: StoreConfig) {
  const state = store();
  const browser = await launchSnapshotBrowser(config.chromiumPath).catch((err) => {
    state.unavailable = `browser failed to start: ${err?.message ?? err}`;
    return null;
  });
  if (browser == null) {
    state.unavailable ??=
      "no browser to render with: install one with `yarn snapshots:install-browser`, or set CHROMIUM_PATH";
    state.queue.clear();
    console.warn(`[map-snapshots] ${state.unavailable}`);
    return;
  }

  try {
    while (state.queue.size > 0) {
      const [key, entry] = state.queue.entries().next().value;
      state.queue.delete(key);
      state.rendering = key;
      const started = Date.now();
      try {
        await renderEntry(browser, entry, config);
        state.failures.delete(key);
        console.log(`[map-snapshots] ✓ ${key} (${Date.now() - started} ms)`);
      } catch (err) {
        const error = err?.message ?? String(err);
        state.failures.set(key, { at: Date.now(), error });
        console.warn(`[map-snapshots] ✗ ${key}: ${error}`);
      }
    }
  } finally {
    await browser.close();
  }
}

async function renderEntry(
  browser: Browser,
  entry: MapSnapshotIndexEntry,
  config: StoreConfig
) {
  const files: Record<string, string> = {};
  for (const pixelRatio of entry.pixelRatios) {
    const image = await captureMapSnapshot(
      browser,
      config.siteURL,
      entry,
      pixelRatio,
      config.timeoutMs
    );
    const file = mapSnapshotFile(entry.key, pixelRatio);
    await writeAtomically(join(config.dir, file), image);
    files[String(pixelRatio)] = file;
  }
  const manifest = await loadManifest(config);
  manifest.entries[entry.key] = {
    width: entry.width,
    height: entry.height,
    files,
    renderedAt: new Date().toISOString(),
  };
  await saveManifest(manifest, config);
}

/** Drop stills of these entries' kind that none of them names any more. */
async function prune(entries: MapSnapshotIndexEntry[], config: StoreConfig) {
  if (entries.length === 0) return;
  const manifest = await loadManifest(config);
  const kinds = new Set(entries.map((e) => e.kind));
  const current = new Set(entries.map((e) => e.key));
  let changed = false;
  for (const [key, record] of Object.entries(manifest.entries)) {
    if (current.has(key) || !kinds.has(key.split("/")[0])) continue;
    delete manifest.entries[key];
    changed = true;
    for (const file of Object.values(record.files)) {
      await rm(join(config.dir, file), { force: true });
    }
  }
  if (changed) await saveManifest(manifest, config);
}

async function loadManifest(config: StoreConfig): Promise<MapSnapshotManifest> {
  const state = store();
  if (state.manifest != null) return state.manifest;
  try {
    state.manifest = JSON.parse(await readFile(join(config.dir, "manifest.json"), "utf8"));
  } catch {
    // Nothing rendered yet, or a directory that didn't survive a restart.
    state.manifest = { version: 1, entries: {} };
  }
  return state.manifest;
}

async function saveManifest(manifest: MapSnapshotManifest, config: StoreConfig) {
  await writeAtomically(
    join(config.dir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
}

/** Write beside, then rename: a reader never sees half a file. */
async function writeAtomically(path: string, data: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, data);
  await rename(temporary, path);
}
