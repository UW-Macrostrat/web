/** An item's references, under a heading with their count and a link to the
 * same list from the API. The list itself is `@macrostrat/data-components`'
 * `ReferenceList`, which compacts the API's formatted citations; a page with
 * a label of its own (a column's sidebar) uses that directly. */
import h from "./references.module.sass";
import { Divider } from "@blueprintjs/core";
import { useMemo } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  countReferences,
  organizeReferences,
  ReferenceList,
  type RawReference,
} from "@macrostrat/data-components";

/** `refs` are strings (server-rendered pages) or `{ id, text }` (with their
 * ids, linkable to the API). */
export function References({ refs }) {
  const raw = useMemo(() => normalizeReferences(refs), [refs]);
  const count = useMemo(() => countReferences(organizeReferences(raw)), [raw]);
  if (count == 0) return null;

  return h("div.int-references", [
    h("div.references-header", [
      h("h3", "References"),
      h("span.reference-count", count.toLocaleString()),
      h("span.spacer"),
      h(ReferenceDownloads, { refs: raw }),
    ]),
    h(Divider),
    h("div.reference-list", h(ReferenceList, { refs: raw })),
  ]);
}

function normalizeReferences(refs: any[] | null | undefined): RawReference[] {
  return (refs ?? []).map((r) => {
    if (typeof r == "string") return { id: null, text: r };
    return r;
  });
}

/** The same references from the API, as CSV and JSON */
function ReferenceDownloads({ refs }: { refs: RawReference[] }) {
  const ids = refs.map((r) => r.id).filter((id) => id != null);
  if (ids.length == 0) return null;
  const base = `${apiV2Prefix}/defs/refs?ref_id=${ids.join(",")}`;
  return h("span.reference-downloads", [
    h("a", { href: `${base}&format=csv`, download: "references.csv" }, "CSV"),
    h("a", { href: base, target: "_blank", rel: "noopener" }, "JSON"),
  ]);
}
