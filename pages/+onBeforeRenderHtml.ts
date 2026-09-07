import { createRequire } from "node:module";
import {
  BlueprintIconsModule,
  loadAllBlueprintIcons,
  loadAllIconsInto,
} from "~/_utils/blueprint-icons";

/** Every copy of `@blueprintjs/icons` that Node has loaded for the server.
 *
 * Blueprint stays external on the server, so `@blueprintjs/core` is loaded by
 * Node (CommonJS build). Under Yarn PnP each library that depends on Blueprint
 * gets its own virtual copy of core, and each of those requires its own copy of
 * the icons package — so there are several icon registries in one process, and
 * the one this app imports is not necessarily the one a library's `Icon` reads.
 * Filling all of them is cheap (memoized per copy) and keeps every
 * server-rendered icon complete, whichever copy renders it. */
function loadedBlueprintIconsCopies(): BlueprintIconsModule[] {
  const require = createRequire(import.meta.url);
  const isIconsEntry = (key: string) =>
    /@blueprintjs\/icons\/lib\/cjs\/index\.js$/.test(key);
  return Object.keys(require.cache)
    .filter(isIconsEntry)
    .map((key) => require.cache[key]!.exports);
}

/** Runs on the server before each page is rendered to HTML (vike-react hook).
 * Registering Blueprint icons here means server-rendered markup carries SVG
 * paths instead of empty icon spans, matching what the client renders. */
export async function onBeforeRenderHtml() {
  const copies = loadedBlueprintIconsCopies();
  await Promise.all([
    loadAllBlueprintIcons(),
    ...copies.map((copy) => loadAllIconsInto(copy)),
  ]);
}
