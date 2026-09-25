/** The cached map views this deployment knows about, for people and for the
 * renderer. The table links each view's snapshot route; the JSON beside it is
 * what `@macrostrat-web/map-snapshot-renderer` reads, so what gets rendered, and the
 * key it is filed under, is always this deployment's answer. */
import h from "@macrostrat/hyper";
import { useData } from "vike-react/useData";
import { Link } from "~/components";
import {
  MAP_SNAPSHOT_INDEX_ELEMENT_ID,
  type MapSnapshotIndexEntry,
} from "@macrostrat-web/map-snapshots";

export function Page() {
  const { entries } = useData() as { entries: MapSnapshotIndexEntry[] };

  return h("div.map-snapshot-index", [
    h("h1", "Map snapshots"),
    h(
      "p",
      "Map views rendered in a headless browser and served as images until a reader asks for the live map."
    ),
    h("table.bp6-html-table.bp6-compact", [
      h("thead", h("tr", [h("th", "View"), h("th", "Size"), h("th", "Key")])),
      h(
        "tbody",
        entries.map((entry) =>
          h("tr", { key: entry.key }, [
            h("td", h(Link, { href: entry.route }, `${entry.kind}/${entry.id}`)),
            h("td", `${entry.width}×${entry.height} @ ${entry.pixelRatios.join(", ")}x`),
            h("td", h("code", entry.key)),
          ])
        )
      ),
    ]),
    h("script", {
      type: "application/json",
      id: MAP_SNAPSHOT_INDEX_ELEMENT_ID,
      dangerouslySetInnerHTML: { __html: toScriptJSON(entries) },
    }),
  ]);
}

/** JSON that can't close the script element it sits in. */
function toScriptJSON(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
