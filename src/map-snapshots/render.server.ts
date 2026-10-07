/** Draws one cached map view in headless Chromium.
 *
 * The web server renders its own snapshot route: the view is loaded at its
 * spec's size and pixel ratio, waited on until its map has settled
 * (`MapSnapshotReporter`), and read back from the WebGL canvas as WebP.
 *
 * WebGL runs on SwiftShader, GPU or not, so a still looks the same from a
 * laptop as from the cluster. The browser is Chromium's headless shell, which
 * the web image installs; in development, Playwright's own copy
 * (`yarn snapshots:install-browser`) or an installed Google Chrome.
 */
import { chromium, type Browser } from "playwright-core";
import {
  MAP_SNAPSHOT_FORMAT,
  type MapSnapshotIndexEntry,
} from "./spec";

/** Software WebGL: headless Chromium has no GPU, and refuses SwiftShader for
 * WebGL unless told it may. */
const CHROMIUM_ARGS = [
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
];

/** An explicit binary if given; else the browser Playwright installed; else
 * an installed Google Chrome. Null when there is none — snapshots are then
 * off, and pages fall back. */
export async function launchSnapshotBrowser(
  chromiumPath?: string
): Promise<Browser | null> {
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
  } catch {
    return null;
  }
}

/** One view at one pixel ratio, as WebP bytes. Throws when the map doesn't
 * settle in time, or the page reports a different key from the one asked for
 * (the spec changed under the request). */
export async function captureMapSnapshot(
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
  });
  const page = await context.newPage();

  try {
    await page.goto(siteURL + entry.route, { timeout: timeoutMs });
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
        // Published by `MapSnapshotReporter` (reporter.ts).
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
      throw new Error(`page reports key ${result.key}, expected ${entry.key}`);
    }
    const base64 = result.dataURL.slice(result.dataURL.indexOf(",") + 1);
    return Buffer.from(base64, "base64");
  } finally {
    await context.close();
  }
}
