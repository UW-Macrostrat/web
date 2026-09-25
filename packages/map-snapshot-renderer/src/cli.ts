/** `yarn snapshots:render` and the container's renderer. Settings are in
 * `config.ts`. Exits non-zero if any view failed, after writing what did
 * render. */
import { readRenderOptions } from "./config";
import { renderMapSnapshots } from "./render";

const options = readRenderOptions();
console.log(`Rendering map snapshots from ${options.siteURL} into ${options.outDir}`);

renderMapSnapshots(options)
  .then(({ rendered, failed }) => {
    console.log(`${rendered.length} rendered, ${failed.length} failed`);
    if (failed.length > 0) process.exit(1);
  })
  .catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  });
