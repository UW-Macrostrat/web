/** An item's references, compactly (see `./references-format`). Its own
 * module, so a page outside the lexicon (a column's sidebar) can list
 * references without loading the rest of the lexicon's components. */
import h from "./references.module.sass";
import { Divider, Icon } from "@blueprintjs/core";
import { Fragment, useMemo, type ReactNode } from "react";
import classNames from "classnames";
import { apiV2Prefix } from "@macrostrat-web/settings";
import {
  countReferences,
  listSeparator,
  narrateParts,
  organizeReferences,
  shortAuthors,
  type ParsedReference,
  type RawReference,
  type ReferenceEntry,
  type ReferenceSection,
  type Volume,
  type VolumeSource,
} from "./references-format";

/** The item's references, compactly: bulleted; titles that link out in place
 * of printed DOIs and URLs; parts of one volume (a drilling expedition's site
 * reports) under its citation; and volumes of a series with several under the
 * series' name. A link to the same list from the API sits in the heading, as
 * the easier form to work with. `refs` are strings (server-rendered pages) or
 * `{ id, text }` (with their ids, linkable to the API). */
export function References({ refs }) {
  const raw = useMemo(() => normalizeReferences(refs), [refs]);
  const sections = useMemo(() => organizeReferences(raw), [raw]);
  if (sections.length == 0) return null;

  return h("div.int-references", [
    h("div.references-header", [
      h("h3", "References"),
      h("span.reference-count", countReferences(sections).toLocaleString()),
      h("span.spacer"),
      h(ReferenceDownloads, { refs: raw }),
    ]),
    h(Divider),
    h(ReferenceSectionList, { sections }),
  ]);
}

/** The same compact list without the heading, for a page that labels it
 * itself (a column's sidebar). */
export function ReferenceList({ refs }) {
  const raw = useMemo(() => normalizeReferences(refs), [refs]);
  const sections = useMemo(() => organizeReferences(raw), [raw]);
  if (sections.length == 0) return null;
  return h(ReferenceSectionList, { sections, compact: true });
}

function ReferenceSectionList({
  sections,
  compact = false,
}: {
  sections: ReferenceSection[];
  compact?: boolean;
}) {
  return h(
    "ul.ref-list",
    { className: classNames({ compact }) },
    sections.map((section, i) => h(ReferenceSectionItem, { key: i, section }))
  );
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

/** A series with several volumes, under its name, open by default */
function ReferenceSectionItem({ section }: { section: ReferenceSection }) {
  const { series, entries } = section;
  if (series == null) return h(ReferenceEntryItem, { entry: entries[0] });

  const count = entries.reduce((n, e) => n + e.references.length, 0);
  return h(
    "li.ref-series",
    h("details", { open: true }, [
      h("summary.series-name", [
        series,
        h("span.reference-count", count.toLocaleString()),
      ]),
      h(
        "ul.series-entries",
        entries.map((entry, i) =>
          h(ReferenceEntryItem, { key: i, entry, inSeries: true })
        )
      ),
    ])
  );
}

function ReferenceEntryItem({
  entry,
  inSeries = false,
}: {
  entry: ReferenceEntry;
  inSeries?: boolean;
}) {
  const { volume, references } = entry;
  if (volume == null) {
    return h(
      "li.ref-item",
      h(SingleReference, { reference: references[0], inSeries })
    );
  }
  return h("li.ref-item.volume", [
    h(VolumeCitation, { volume, inSeries }),
    h(VolumeParts, { references }),
  ]);
}

/** A volume's cited parts: where they're all sites, one sentence of links
 * ("Sites 1126, 1127, and 1130") that continues the citation; else a line of
 * linked titles beneath it */
function VolumeParts({ references }: { references: ParsedReference[] }) {
  const narrated = narrateParts(references);
  if (narrated != null) {
    const { noun, parts } = narrated;
    return h("span.volume-parts.narrated", [
      `${noun} `,
      ...parts.map((part, i) =>
        h(Fragment, { key: i }, [
          listSeparator(i, parts.length),
          h(
            "span",
            { title: pagesLabel(part.pages) },
            h(TitleLink, { title: part.label, href: part.link })
          ),
        ])
      ),
      ".",
    ]);
  }
  return h(
    "ul.volume-parts",
    references.map((ref, i) =>
      h(
        "li.volume-part",
        { key: i, title: pagesLabel(ref.part?.pages) },
        h(TitleLink, { title: ref.part?.title, href: ref.link })
      )
    )
  );
}

/** A volume's citation; within its series, led by the volume number and
 * without the series' name */
function VolumeCitation({
  volume,
  inSeries,
}: {
  volume: Volume;
  inSeries: boolean;
}) {
  const { authors, container, year, source } = volume;
  const fullAuthors = authors.join(", ");
  if (inSeries && source != null) {
    return h("span.ref-text", { title: fullAuthors }, [
      h(VolumeLabel, { source }),
      `${sentence(shortAuthors(authors))} In ${sentence(
        source.editors
      )} ${year}.`,
    ]);
  }
  return h(
    "span.ref-text",
    { title: fullAuthors },
    `${sentence(shortAuthors(authors))} In ${sentence(container)} ${year}.`
  );
}

function SingleReference({
  reference,
  inSeries,
}: {
  reference: ParsedReference;
  inSeries: boolean;
}) {
  const { part, text, link } = reference;
  if (part == null) {
    // No title to carry the link, so it gets an icon
    return h("span.ref-text", [text, h(LinkIcon, { href: link })]);
  }
  const { authors, title, container, pages, year, source } = part;
  const pageText = pages ? `, ${pages}` : "";
  const titleLink = h(TitleLink, { title, href: link });
  if (inSeries && source != null) {
    return h("span.ref-text", { title: authors.join(", ") }, [
      h(VolumeLabel, { source }),
      `${sentence(shortAuthors(authors))} `,
      titleLink,
      `. In ${sentence(source.editors + pageText)} ${year}.`,
    ]);
  }
  return h("span.ref-text", { title: authors.join(", ") }, [
    `${sentence(shortAuthors(authors))} `,
    titleLink,
    `. In ${sentence(container + pageText)} ${year}.`,
  ]);
}

/** Ends a phrase with one full stop, which "et al." already has */
function sentence(text: string): string {
  if (text.endsWith(".")) return text;
  return text + ".";
}

/** Within a series: the volume's number, and its own title if it has one */
function VolumeLabel({ source }: { source: VolumeSource }) {
  const { volume, volumeTitle } = source;
  return h([
    h.if(volume != null)("span.volume-number", volume),
    h.if(volumeTitle != null)("span.volume-title", `${volumeTitle}. `),
  ]);
}

/** A title that is itself the link, where there is one */
function TitleLink({ title, href }: { title: ReactNode; href: string | null }) {
  if (href == null) return h("span.ref-title", title);
  return h("a.ref-title", { href, target: "_blank", rel: "noopener" }, title);
}

function LinkIcon({ href }: { href: string | null }) {
  if (href == null) return null;
  return h(
    "a.ref-link",
    {
      href,
      target: "_blank",
      rel: "noopener",
      title: href,
      "aria-label": "Open reference",
    },
    h(Icon, { icon: "share", size: 11 })
  );
}

function pagesLabel(pages: string | null | undefined): string | undefined {
  if (pages == null) return undefined;
  return `Pages ${pages}`;
}
