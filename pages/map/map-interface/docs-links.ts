import { websiteDocsPrefix } from "@macrostrat-web/settings";

/** The map interface's documentation lives in `docs/map` of this repository
 * and is published with the rest of the site's documentation. These are
 * server-side pages, so link to them with plain anchors rather than the map's
 * own client-side router. */
export const mapUsageDocsURL = `${websiteDocsPrefix}/map/usage`;
export const mapChangelogDocsURL = `${websiteDocsPrefix}/map/changelog`;
