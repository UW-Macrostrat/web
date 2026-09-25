/** Renders a site's cached map views to images.
 *
 * Reads the list of views, and the key each is filed under, from the target
 * site's `/dev/map-snapshot` index — so what gets rendered is the deployed
 * site's idea of it, not this checkout's. Each view is loaded in headless
 * Chromium at its own size and pixel ratio, waited on until its map has
 * settled, and read back from the WebGL canvas as WebP.
 *
 * Writes `<out>/<key>@<ratio>x.webp` and merges `<out>/manifest.json`. Getting
 * the directory to where the site reads it is someone else's job: the
 * container's entrypoint syncs it to the bucket, and the local workflow writes
 * it straight into the site's `public/`.
 *
 * WebGL runs on SwiftShader on every machine, GPU or not, so a render looks the
 * same from a laptop as from the cluster.
 */
import { chromium, type Browser } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  MAP_SNAPSHOT_FORMAT,
  MAP_SNAPSHOT_INDEX_ELEMENT_ID,
  MAP_SNAPSHOT_INDEX_ROUTE,
  mapSnapshotFile,
  type MapSnapshotIndexEntry,
  type MapSnapshotManifest,
  type MapSnapshotManifestEntry,
} from "@macrostrat-web/map-snapshots";

export interface RenderOptions {
  /** The site to render, e.g. `http://localhost:3000`. */
  siteURL: string;
  outDir: string;
  /** `kind/id` pairs; everything when empty. */
  only?: string[];
  timeoutMs?: number;
  /** A Chromium or Chrome binary, when Playwright's own isn't installed. */
  chromiumPath?: string;
}

export interface RenderResult {
  rendered: string[];
  failed: { key: string; error: string }[];
}

export async function renderMapSnapshots(
  options: RenderOptions
): Promise<RenderResult> {
  const siteURL = options.siteURL.replace(/\/+$/, "");
  const { outDir, only = [], timeoutMs = 120_000 } = options;

  const browser = await launchBrowser(options.chromiumPath);
  const result: RenderResult = { rendered: [], failed: [] };
  try {
    const index = await readIndex(browser, siteURL);
    const wanted = selectEntries(index, only);
    await mkdir(outDir, { recursive: true });
    const manifest = await readManifest(outDir, index);

    for (const entry of wanted) {
      try {
        manifest.entries[entry.key] = await renderEntry(browser, siteURL, outDir, entry, timeoutMs);
        result.rendered.push(entry.key);
        console.log(`✓ ${entry.key}`);
      } catch (err) {
        result.failed.push({ key: entry.key, error: err?.message ?? String(err) });
        console.error(`✗ ${entry.key}: ${err?.message ?? err}`);
      }
    }

    manifest.generatedAt = new Date().toISOString();
    await writeFile(
      join(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
  } finally {
    await browser.close();
  }
  return result;
}

/** Software WebGL: headless Chromium has no GPU, and refuses SwiftShader for
 * WebGL unless told it may. */
const CHROMIUM_ARGS = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
];

/** An explicit binary if given; else the browser Playwright installed (its
 * headless shell — the container's, or one from `playwright-core install`);
 * else an installed Google Chrome, which is what most laptops already have. */
export async function launchBrowser(chromiumPath?: string): Promise<Browser> {
  if (chromiumPath) {
    return chromium.launch({ executablePath: chromiumPath, args: CHROMIUM_ARGS });
  }
  try {
    return await chromium.launch({ args: CHROMIUM_ARGS });
  } catch (err) {
    if (!/Executable doesn't exist/.test(err?.message ?? "")) throw err;
  }
  try {
    return await chromium.launch({ channel: "chrome", args: CHROMIUM_ARGS });
  } catch (err) {
    throw new Error(
      "No browser to render with. Install Playwright's headless Chromium " +
        "(yarn snapshots:install-browser), install Google Chrome, or set " +
        "CHROMIUM_PATH to a Chromium binary."
    );
  }
}

/** The target site's list of views. */
async function readIndex(
  browser: Browser,
  siteURL: string
): Promise<MapSnapshotIndexEntry[]> {
  const page = await browser.newPage();
  try {
    const response = await page.goto(siteURL + MAP_SNAPSHOT_INDEX_ROUTE);
    if (response == null || !response.ok()) {
      throw new Error(
        `${siteURL}${MAP_SNAPSHOT_INDEX_ROUTE} answered ${response?.status() ?? "nothing"}`
      );
    }
    const text = await page
      .locator(`#${MAP_SNAPSHOT_INDEX_ELEMENT_ID}`)
      .textContent();
    return JSON.parse(text ?? "[]");
  } finally {
    await page.close();
  }
}

function selectEntries(
  index: MapSnapshotIndexEntry[],
  only: string[]
): MapSnapshotIndexEntry[] {
  if (only.length === 0) return index;
  const selected = index.filter((e) => only.includes(`${e.kind}/${e.id}`));
  if (selected.length === 0) {
    throw new Error(`No snapshots match ${only.join(", ")}`);
  }
  return selected;
}

/** The existing manifest, less any entry the site no longer lists — a view
 * whose spec changed has a new key, and the old image is no longer anyone's. */
async function readManifest(
  outDir: string,
  index: MapSnapshotIndexEntry[]
): Promise<MapSnapshotManifest> {
  let manifest: MapSnapshotManifest = {
    version: 1,
    generatedAt: "",
    entries: {},
  };
  try {
    manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
  } catch {
    // First run.
  }
  const current = new Set(index.map((e) => e.key));
  for (const key of Object.keys(manifest.entries)) {
    if (!current.has(key)) delete manifest.entries[key];
  }
  return manifest;
}

async function renderEntry(
  browser: Browser,
  siteURL: string,
  outDir: string,
  entry: MapSnapshotIndexEntry,
  timeoutMs: number
): Promise<MapSnapshotManifestEntry> {
  const files: Record<string, string> = {};
  for (const pixelRatio of entry.pixelRatios) {
    const file = mapSnapshotFile(entry.key, pixelRatio);
    const image = await capture(browser, siteURL, entry, pixelRatio, timeoutMs);
    const path = join(outDir, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, image);
    files[String(pixelRatio)] = file;
  }
  return {
    width: entry.width,
    height: entry.height,
    files,
    renderedAt: new Date().toISOString(),
  };
}

async function capture(
  browser: Browser,
  siteURL: string,
  entry: MapSnapshotIndexEntry,
  pixelRatio: number,
  timeoutMs: number
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: entry.width, height: entry.height },
    deviceScaleFactor: pixelRatio,
    // The still is what a first-time reader sees: no stored theme or state.
    colorScheme: "light",
    // A local stack's Caddy certificate isn't one Chromium knows.
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.warn(`  [${entry.key}] ${err.message}`));

  try {
    await page.goto(siteURL + entry.route);
    await page.waitForFunction(
      () => {
        const status = document.documentElement.dataset.mapSnapshot;
        return status === "ready" || status === "timeout";
      },
      null,
      { timeout: timeoutMs, polling: 250 }
    );

    const result = await page.evaluate(
      ({ mimeType, quality }) => {
        // Published by `MapSnapshotReporter` (web: src/map-snapshots/reporter.ts).
        const handle = (window as any).__macrostratMapSnapshot;
        if (handle == null) return null;
        let dataURL: string | null = null;
        if (handle.status === "ready") dataURL = handle.capture(mimeType, quality);
        return { key: handle.key, status: handle.status, dataURL };
      },
      { mimeType: MAP_SNAPSHOT_FORMAT.mimeType, quality: MAP_SNAPSHOT_FORMAT.quality }
    );

    if (result == null) throw new Error("the page published no snapshot handle");
    if (result.status !== "ready") throw new Error(`map did not settle (${result.status})`);
    if (result.key !== entry.key) {
      throw new Error(`page reports key ${result.key}, index says ${entry.key}`);
    }
    const base64 = result.dataURL.slice(result.dataURL.indexOf(",") + 1);
    return Buffer.from(base64, "base64");
  } finally {
    await context.close();
  }
}
