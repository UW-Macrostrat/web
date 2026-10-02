/** The publications library, formatted for the site pages. Records come from
 * the vault's `Site/data/publications.json`, written from the Zotero group by
 * `.tooling/fetch-citations.mjs` in Macrostrat/docs. Server only: citation-js
 * and the CSL style stay out of the client bundle, which receives finished
 * strings. */
import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import "@citation-js/plugin-bibtex";
import gsaStyle from "./csl/the-geological-society-of-america.csl?raw";

export interface Publication {
  id: string;
  year: number | null;
  /** The formatted citation, with the DOI as a link. */
  html: string;
  bibtex: string;
  /** A link for entries without a DOI. */
  url: string | null;
}

export interface PlatformPaper extends Publication {
  note: string;
}

/** The collection the bibliography lists. */
const bibliographyCollection = "Papers using Macrostrat";

/** The papers to cite for the platform, until the library has an
 * Infrastructure collection. */
const platformPaperDOIs = [
  { doi: "10.1002/gdj3.189", note: "Macrostrat v2" },
  { doi: "10.1029/2018gc007467", note: "The platform" },
];

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

export function platformPapers(records: any[]): PlatformPaper[] {
  const byDOI = new Map(formatAll(records).map((r) => [r.doi, r.publication]));
  const papers: PlatformPaper[] = [];
  for (const { doi, note } of platformPaperDOIs) {
    const publication = byDOI.get(doi);
    if (publication == null) {
      console.warn(`[citations] platform paper ${doi} is not in the library`);
      continue;
    }
    papers.push({ ...publication, note });
  }
  return papers;
}

function formatRecord(csl: any): Publication {
  const cite = new Cite(csl);
  const bibliography = cite.format("bibliography", { format: "html", template: style, lang: "en-US" });
  let url: string | null = null;
  if (csl.DOI == null) url = csl.URL ?? null;
  return {
    id: csl.id,
    year: issuedYear(csl),
    html: linkDOI(entryHTML(bibliography), csl.DOI),
    bibtex: cite.format("bibtex").trim(),
    url,
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

function linkDOI(html: string, doi: string | undefined): string {
  if (doi == null) return html;
  const text = `doi:${doi}`;
  const link = `<a href="https://doi.org/${encodeURI(doi)}" target="_blank" rel="noopener">${text}</a>`;
  return html.replace(text, link);
}
