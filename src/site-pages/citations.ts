/** The publications library, formatted for the site pages. Records come from
 * the vault's `Site/data/publications.json`, written from the Zotero group by
 * `.tooling/fetch-citations.mjs` in Macrostrat/docs. Server only: citation-js
 * and the CSL style stay out of the client bundle, which receives finished
 * strings. */
import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import gsaStyle from "./csl/the-geological-society-of-america.csl?raw";

export interface Publication {
  id: string;
  year: number | null;
  /** The formatted citation, without links: the card around it is the link. */
  html: string;
  /** The DOI's resolver URL, or the record's URL when it has no DOI. */
  href: string | null;
}

/** The collection the bibliography lists. */
const bibliographyCollection = "Papers using Macrostrat";

const style = "gsa";
plugins.config.get("@csl").styles.add(style, gsaStyle);

interface FormattedRecord {
  publication: Publication;
  doi: string | null;
  collections: string[];
}

/** Formatting all records takes a few hundred milliseconds; do it once per
 * parsed file. */
const formatted = new WeakMap<object, FormattedRecord[]>();

function formatAll(records: any[]): FormattedRecord[] {
  let result = formatted.get(records);
  if (result != null) return result;
  result = records.map((record) => {
    const { macrostrat_collections, accessed, ...csl } = record;
    return {
      publication: formatRecord(csl),
      doi: csl.DOI?.toLowerCase() ?? null,
      collections: macrostrat_collections ?? [],
    };
  });
  formatted.set(records, result);
  return result;
}

export function bibliography(records: any[]): Publication[] {
  return formatAll(records)
    .filter((r) => r.collections.includes(bibliographyCollection))
    .map((r) => r.publication);
}

export function publicationByDOI(records: any[], doi: string): Publication | null {
  const key = doi.toLowerCase();
  return formatAll(records).find((r) => r.doi === key)?.publication ?? null;
}

function formatRecord(record: any): Publication {
  // The card links to the URL, so the style shouldn't print it.
  const { URL, ...csl } = record;
  const cite = new Cite(csl);
  const bibliography = cite.format("bibliography", { format: "html", template: style, lang: "en-US" });
  return {
    id: csl.id,
    year: issuedYear(csl),
    html: entryHTML(bibliography),
    href: publicationHref(csl.DOI, URL),
  };
}

/** Zotero writes some years as strings. */
function issuedYear(csl: any): number | null {
  const year = Number(csl.issued?.["date-parts"]?.[0]?.[0]);
  if (!Number.isFinite(year) || year === 0) return null;
  return year;
}

/** The inside of citeproc's `<div class="csl-entry">`. */
function entryHTML(bibliography: string): string {
  const m = /<div[^>]*class="csl-entry"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*$/.exec(bibliography);
  return (m?.[1] ?? bibliography).trim();
}

function publicationHref(doi: string | undefined, url: string | undefined): string | null {
  if (doi != null) return `https://doi.org/${encodeURI(doi)}`;
  return url ?? null;
}
