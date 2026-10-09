import { MasonryScrollBody } from "@macrostrat/data-sheet";
import { LinkCard } from "~/components/cards";
import h from "./components.module.sass";
import type { Publication } from "../citations";

const zoteroLibrary = "https://www.zotero.org/groups/6644229/macrostrat/library";

/** The library's bibliography, newest first, in two balanced columns. */
export function Bibliography({ publications }: { publications: Publication[] }) {
  return h(
    "div.bibliography",
    h(
      MasonryScrollBody,
      { columns: 2, minColumnWidth: 320 },
      (publications ?? []).map((p) =>
        // A DOM wrapper, because the masonry measures each item through its ref.
        h("div", { key: p.id }, h(LinkCard, { href: p.href, density: "list" }, h(Citation, { publication: p })))
      )
    )
  );
}

/** The count and a link to the library, beside the bibliography's heading. */
export function BibliographySummary({ publications }: { publications: Publication[] }) {
  const entries = publications ?? [];
  const years = entries.map((p) => p.year).filter((y) => y != null);
  let count = `${entries.length} papers`;
  if (years.length > 0) {
    count += ` since ${Math.min(...years)}`;
  }
  return h("div.pub-summary", [
    h("span.pub-count", count),
    h("a.pub-zotero", { href: zoteroLibrary, target: "_blank", rel: "noopener" }, "View in Zotero"),
  ]);
}

function Citation({ publication }: { publication: Publication }) {
  return h("span.pub-citation", { dangerouslySetInnerHTML: { __html: publication.html } });
}
