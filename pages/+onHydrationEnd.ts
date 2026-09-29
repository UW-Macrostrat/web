import { watchTileToken } from "~/_utils/tile-token";

/** Runs once in the browser, after the first page is hydrated. Setup that lasts
 * the life of the page goes here rather than in a per-render hook. */
export function onHydrationEnd() {
  watchTileToken();
}
