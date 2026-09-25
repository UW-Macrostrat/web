/** Renders the site's cached map views to images.
 *
 *   yarn snapshots:render --base-url http://localhost:3000 --out dist/map-snapshots
 *   yarn snapshots:render --base-url https://dev.macrostrat.org --only hero/grand-canyon
 *
 * Reads the list of views, and the key each is filed under, from the target
 * site's `/dev/map-snapshot` index — so what gets rendered is the deployed
 * site's idea of it, not this checkout's. Each view is loaded in headless
 * Chromium at its own size and pixel ratio, waited on until its map has
 * settled, and read back from the WebGL canvas as WebP.
 *
 * Writes `<out>/<key>@<ratio>x.webp` and merges `<out>/manifest.json`. Getting
 * the directory to where the site reads it (`MACROSTRAT_MAP_SNAPSHOTS_URL`) —
 * e.g. `aws s3 sync <out> s3://…/map-snapshots/` — is a separate step, so this
 * script never holds bucket credentials.
 *
 * WebGL runs on SwiftShader, so no GPU is needed; a terrain view takes some
 * seconds. `--chromium` (or `CHROMIUM_PATH`) points at a browser when
 * Playwright's own isn't installed.
 */
import { chromium, type Browser } from "playwright-core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import {
  MAP_SNAPSHOT_FORMAT,
  MAP_SNAPSHOT_INDEX_ELEMENT_ID,
  MAP_SNAPSHOT_INDEX_ROUTE,
  mapSnapshotFile,
  type MapSnapshotIndexEntry,
} from "../src/map-snapshots/spec";
import type { MapSnapshotManifest } from "../src/map-snapshots/manifest";

const { values: args } = parseArgs({
  options: {
    "base-url": { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: "dist/map-snapshots" },
    only: { type: "string", multiple: true },
    chromium: { type: "string", default: process.env.CHROMIUM_PATH },
    timeout: { type: "string", default: "120000" },
  },
});

const baseURL = args["base-url"].replace(/\/+$/, "");
const outDir = args.out;
const timeoutMs = Number(args.timeout);

async function main() {
  const browser = await chromium.launch({
    executablePath: args.chromium,
    // Software WebGL: headless Chromium has no GPU, and refuses SwiftShader
    // for WebGL unless told it may.
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });

  let failures = 0;
  try {
    const index = await readIndex(browser);
    const wanted = selectEntries(index, args.only);
    const manifest = await readManifest(index);
    await mkdir(outDir, { recursive: true });

    for (const entry of wanted) {
      try {
        manifest.entries[entry.key] = await renderEntry(browser, entry);
        console.log(`✓ ${entry.key}`);
      } catch (err) {
        failures += 1;
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

  if (failures > 0) {
    console.error(`${failures} snapshot(s) failed`);
    process.exit(1);
  }
}

/** The target site's list of views. */
async function readIndex(browser: Browser): Promise<MapSnapshotIndexEntry[]> {
  const page = await browser.newPage();
  try {
    await page.goto(baseURL + MAP_SNAPSHOT_INDEX_ROUTE);
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
  only: string[] | undefined
): MapSnapshotIndexEntry[] {
  if (only == null || only.length === 0) return index;
  const selected = index.filter((e) => only.includes(`${e.kind}/${e.id}`));
  if (selected.length === 0) {
    throw new Error(`No snapshots match ${only.join(", ")}`);
  }
  return selected;
}

/** The existing manifest, less any entry the site no longer lists — a view
 * whose spec changed has a new key, and the old image is no longer anyone's. */
async function readManifest(
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

async function renderEntry(browser: Browser, entry: MapSnapshotIndexEntry) {
  const files: Record<string, string> = {};
  for (const pixelRatio of entry.pixelRatios) {
    const file = mapSnapshotFile(entry.key, pixelRatio);
    const image = await capture(browser, entry, pixelRatio);
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
  entry: MapSnapshotIndexEntry,
  pixelRatio: number
): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: entry.width, height: entry.height },
    deviceScaleFactor: pixelRatio,
    // The still is what a first-time reader sees: no stored theme or state.
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.warn(`  [${entry.key}] ${err.message}`));

  try {
    await page.goto(baseURL + entry.route);
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
        // Published by `MapSnapshotReporter` (src/map-snapshots/reporter.ts).
        const handle = (window as any).__macrostratMapSnapshot;
        if (handle == null) return null;
        return {
          key: handle.key,
          status: handle.status,
          dataURL: handle.status === "ready" ? handle.capture(mimeType, quality) : null,
        };
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
