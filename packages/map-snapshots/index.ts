/** Cached map views: the names the site and the renderer share.
 *
 * No dependencies, so the renderer's container can install this without the
 * app. The site's manifest loader and in-page reporter live in the app
 * (`src/map-snapshots/`); the renderer is `@macrostrat-web/map-snapshot-renderer`.
 */
export * from "./spec";
export * from "./manifest";
