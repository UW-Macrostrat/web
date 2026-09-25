/** `yarn snapshots:local`: render the stills from the dev server you already
 * have running, straight into the site's `public/map-snapshots/`, where Vite
 * serves them.
 *
 * The site reads them once `VITE_MACROSTRAT_MAP_SNAPSHOTS_URL=/map-snapshots`
 * is in web's `.env` (and the dev server has been restarted to pick it up).
 * A relative URL means "files under `public/`": the browser loads the images
 * from whatever origin served the page — `localhost:3000` or
 * `dev.macrostrat.local` alike — and the server reads the manifest from disk.
 * This checks the running server's setting and says what to change.
 *
 * Takes the same flags and variables as `yarn snapshots:render` (see
 * `config.ts`) except `--out`.
 */
import { fileURLToPath } from "node:url";
import { MAP_SNAPSHOT_INDEX_ROUTE } from "@macrostrat-web/map-snapshots";
import { readRenderOptions } from "./config";
import { renderMapSnapshots } from "./render";

const LOCAL_SNAPSHOTS_URL = "/map-snapshots";

const webRoot = fileURLToPath(new URL("../../../", import.meta.url));
const outDir = fileURLToPath(new URL("../../../public/map-snapshots", import.meta.url));

async function main() {
  const options = { ...readRenderOptions(), outDir };

  const configured = await runningSnapshotSetting(options.siteURL);
  console.log(`Rendering map snapshots from ${options.siteURL} into ${outDir}`);

  const { rendered, failed } = await renderMapSnapshots(options);
  console.log(`${rendered.length} rendered, ${failed.length} failed`);

  if (configured === LOCAL_SNAPSHOTS_URL) {
    console.log("The dev server reads these already: reload the homepage.");
  } else {
    let current = "not set";
    if (configured != null) current = `set to ${configured}`;
    console.log(
      [
        "",
        `The running dev server's MACROSTRAT_MAP_SNAPSHOTS_URL is ${current}.`,
        `To see these stills, add this to ${webRoot}.env and restart the dev server:`,
        "",
        `  VITE_MACROSTRAT_MAP_SNAPSHOTS_URL=${LOCAL_SNAPSHOTS_URL}`,
        "",
      ].join("\n")
    );
  }
  if (failed.length > 0) process.exit(1);
}

/** What the running server reads its stills from, as it tells the browser in
 * `window.env`. Throws with a hint when there is no server to ask. */
async function runningSnapshotSetting(siteURL: string): Promise<string | null> {
  const url = siteURL.replace(/\/+$/, "") + MAP_SNAPSHOT_INDEX_ROUTE;
  let html: string;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    throw new Error(
      `Couldn't reach ${url} (${err?.message ?? err}). Start the dev server ` +
        "(yarn dev), or point MAP_SNAPSHOTS_SITE_URL at the one you have."
    );
  }
  const match = /window\.env\s*=\s*(\{.*?\});/s.exec(html);
  if (match == null) return null;
  try {
    return JSON.parse(match[1]).MACROSTRAT_MAP_SNAPSHOTS_URL ?? null;
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
