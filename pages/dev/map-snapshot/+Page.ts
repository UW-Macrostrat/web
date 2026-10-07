/** The cached map views this server knows about, and where each one stands:
 * drawn, queued, rendering, failed. Loading the page queues anything missing.
 * Each view links to the snapshot route the server's own headless browser
 * renders it from — open one to see exactly what the still will show. */
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { Tag } from "@blueprintjs/core";
import { Link } from "~/components";
import type { MapSnapshotStatus } from "~/map-snapshots/spec";

const stateIntents = {
  ready: "success",
  stale: "warning",
  queued: "primary",
  rendering: "primary",
  failed: "danger",
  missing: "none",
} as const;

export function Page() {
  const { statuses } = useData() as { statuses: MapSnapshotStatus[] };

  return h("div.map-snapshot-index", [
    h("h1", "Map snapshots"),
    h(
      "p",
      "Map views this server renders in headless Chromium and serves as images until a reader asks for the live map. Missing and stale ones are drawn in the background when a page — or this one — asks for them."
    ),
    h("table.bp6-html-table.bp6-compact", [
      h(
        "thead",
        h("tr", [
          h("th", "View"),
          h("th", "State"),
          h("th", "Rendered"),
          h("th", "Size"),
          h("th", "Key"),
        ])
      ),
      h("tbody", statuses.map(statusRow)),
    ]),
  ]);
}

function statusRow(status: MapSnapshotStatus) {
  const { entry } = status;
  let detail = null;
  if (status.error != null) detail = h("div.map-snapshot-error", status.error);
  return h("tr", { key: entry.key }, [
    h("td", h(Link, { href: entry.route }, `${entry.kind}/${entry.id}`)),
    h("td", [h(Tag, { minimal: true, intent: stateIntents[status.state] }, status.state), detail]),
    h("td", status.renderedAt ?? "—"),
    h("td", `${entry.width}×${entry.height} @ ${entry.pixelRatios.join(", ")}x`),
    h("td", h("code", entry.key)),
  ]);
}
