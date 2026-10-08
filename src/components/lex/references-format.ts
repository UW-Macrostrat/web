/** Turning the API's formatted reference strings into something compact: one
 * link instead of printed DOIs and URLs, long author lists shortened, the parts
 * of one volume (the sites of a drilling expedition's proceedings) gathered
 * under the volume's citation, and volumes of one series under the series' name.
 * Pure, so it runs alike on the server and in the browser. */

export interface RawReference {
  /** The reference's id in the API, for linking to it there */
  id: number | null;
  text: string;
}

export interface ParsedReference {
  id: number | null;
  /** The citation with its DOI and URL taken out */
  text: string;
  /** Where to read it: the DOI where there is one, else the URL */
  link: string | null;
  /** For a part of a volume ("Authors. Title. In Volume, pages. Year.") */
  part: VolumePart | null;
}

export interface Volume {
  authors: string[];
  container: string;
  year: string;
  /** The container read as editors, series, volume number and publisher */
  source: VolumeSource | null;
}

export interface VolumePart extends Volume {
  title: string;
  pages: string | null;
}

export interface VolumeSource {
  editors: string;
  series: string;
  volume: string | null;
  /** A volume's own title, where it has one ("South China Sea Rifted Margin") */
  volumeTitle: string | null;
  publisher: string | null;
}

/** A lone reference, or a volume with the parts of it that are cited */
export interface ReferenceEntry {
  volume: Volume | null;
  references: ParsedReference[];
}

/** Entries under a series' name, where a series has several; a lone entry
 * otherwise (`series: null`) */
export interface ReferenceSection {
  series: string | null;
  entries: ReferenceEntry[];
}

const DOI_PATTERN =
  /(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)?(10\.\d{4,9}\/\S+?)(?=[.,;]?(?:\s|$))/i;
// With a scheme, or a bare host starting "www" ("www-odp.tamu.edu/…" occurs)
const URL_PATTERN =
  /(?:https?:\/\/\S+?|www[\w.-]*\.[a-z]{2,}(?:\/\S*?)?)(?=[.,;]?(?:\s|$))/i;

export function parseReference({
  id,
  text: raw,
}: RawReference): ParsedReference {
  let text = raw.trim();
  let link: string | null = null;

  const doi = text.match(DOI_PATTERN);
  if (doi != null) {
    link = "https://doi.org/" + doi[1];
    text = text.replace(doi[0], "");
  }
  // Every URL goes; the first is the link when there's no DOI
  let url = text.match(URL_PATTERN);
  while (url != null) {
    link ??= normalizeURL(url[0]);
    text = text.replace(url[0], "");
    url = text.match(URL_PATTERN);
  }
  text = tidy(text);

  return { id, text, link, part: parseVolumePart(text) };
}

function normalizeURL(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return "https://" + url;
}

/** Close the gaps the removed links leave: ". ." runs and stray spaces */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/(\.\s*)+\./g, ".")
    .replace(/\s+([.,;])/g, "$1")
    .trim();
}

const VOLUME_TAIL = /^(.*?)(?:,\s*(\d+\s*[–-]\s*\d+))?\.\s*(\d{4})\.?$/;

function parseVolumePart(text: string): VolumePart | null {
  const inAt = text.indexOf(". In ");
  if (inAt < 0) return null;
  const head = text.slice(0, inAt);
  const tail = text.slice(inAt + ". In ".length);

  const titleAt = head.lastIndexOf(". ");
  if (titleAt < 0) return null;
  const tailMatch = tail.match(VOLUME_TAIL);
  if (tailMatch == null) return null;

  const [, container, pages, year] = tailMatch;
  return {
    authors: splitAuthors(head.slice(0, titleAt)),
    title: head.slice(titleAt + 2),
    container: container.trim(),
    pages: pages ?? null,
    year,
    source: parseSource(container.trim()),
  };
}

// "Feary, D.A., …, et al., Proc. ODP, Init. Repts., 183: College Station, TX
// (Ocean Drilling Program)" and the "and the Expedition N Scientists" form; a
// joint expedition's volume is "367/368"
const SOURCE_PATTERN =
  /^(.*?(?:et al\.|Scientists)),\s*(.+?)(?:,\s*(?:Expedition\s+|Leg\s+|Vol\.\s*)?(\d+(?:\/\d+)?))?(?::\s*(.*))?$/;

// Later IODP volumes put their own title ahead of the series' name:
// "South China Sea Rifted Margin. Proceedings of the International Ocean
// Discovery Program"
const TITLED_SERIES = /^(.+?)\.\s+(Proceedings of .+)$/;

function parseSource(container: string): VolumeSource | null {
  const match = container.match(SOURCE_PATTERN);
  if (match == null) return null;
  const [, editors, rawSeries, volume, publisher] = match;
  let series = rawSeries.trim();
  let volumeTitle: string | null = null;
  const titled = series.match(TITLED_SERIES);
  if (titled != null) {
    volumeTitle = titled[1];
    series = titled[2];
  }
  return {
    editors,
    series,
    volume: volume ?? null,
    volumeTitle,
    publisher: publisher ?? null,
  };
}

/** "Last, I.I., Last, I., and Last, I." → one entry per author */
function splitAuthors(authors: string): string[] {
  return authors
    .split(/(?<=\.),\s+(?:and\s+)?|,\s+and\s+/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

const SHOWN_AUTHORS = 3;

/** At most three authors, then "et al." */
export function shortAuthors(authors: string[]): string {
  if (authors.length <= SHOWN_AUTHORS) return authors.join(", ");
  return authors.slice(0, SHOWN_AUTHORS).join(", ") + ", et al.";
}

/** References in their order: parts of one volume gathered at the first one's
 * place, volumes of a series with several under its name, and each reference
 * once. */
export function organizeReferences(raw: RawReference[]): ReferenceSection[] {
  return gatherSeries(gatherVolumes(raw));
}

function gatherVolumes(raw: RawReference[]): ReferenceEntry[] {
  const seen = new Set<string>();
  const entries: ReferenceEntry[] = [];
  const byVolume = new Map<string, ReferenceEntry>();

  for (const r of raw) {
    if (typeof r?.text != "string" || seen.has(r.text)) continue;
    seen.add(r.text);
    const ref = parseReference(r);
    const part = ref.part;
    if (part == null) {
      entries.push({ volume: null, references: [ref] });
      continue;
    }
    const key = [part.authors.join("; "), part.container, part.year].join("|");
    let entry = byVolume.get(key);
    if (entry == null) {
      const { authors, container, year, source } = part;
      entry = { volume: { authors, container, year, source }, references: [] };
      byVolume.set(key, entry);
      entries.push(entry);
    }
    entry.references.push(ref);
  }

  // A volume cited once reads better as itself
  return entries.map((entry) => {
    if (entry.volume != null && entry.references.length == 1) {
      return { volume: null, references: entry.references };
    }
    return entry;
  });
}

function seriesOf(entry: ReferenceEntry): string | null {
  const source = entry.volume?.source ?? entry.references[0]?.part?.source;
  return source?.series ?? null;
}

function gatherSeries(entries: ReferenceEntry[]): ReferenceSection[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const series = seriesOf(entry);
    if (series != null) counts.set(series, (counts.get(series) ?? 0) + 1);
  }

  const sections: ReferenceSection[] = [];
  const bySeries = new Map<string, ReferenceSection>();
  for (const entry of entries) {
    const series = seriesOf(entry);
    if (series == null || (counts.get(series) ?? 0) < 2) {
      sections.push({ series: null, entries: [entry] });
      continue;
    }
    let section = bySeries.get(series);
    if (section == null) {
      section = { series, entries: [] };
      bySeries.set(series, section);
      sections.push(section);
    }
    section.entries.push(entry);
  }
  return sections;
}

/** How many references the sections hold */
export function countReferences(sections: ReferenceSection[]): number {
  let n = 0;
  for (const section of sections) {
    for (const entry of section.entries) n += entry.references.length;
  }
  return n;
}

/** One linked item in a sentence of a volume's parts: a site number, or a
 * chapter that covers two ("1141 & 1142") */
export interface NarratedPart {
  label: string;
  link: string | null;
  pages: string | null;
}

export interface NarratedParts {
  /** "Site" or "Sites", as the count needs */
  noun: string;
  parts: NarratedPart[];
}

const PART_TITLE = /^(Site|Hole|Leg)(s?)\s+(.+)$/;

/** A volume's parts as one sentence ("Sites 1126, 1127, and 1130"), where
 * every title names the same kind of part; null where they don't. */
export function narrateParts(
  references: ParsedReference[]
): NarratedParts | null {
  let noun: string | null = null;
  let count = 0;
  const parts: NarratedPart[] = [];
  for (const ref of references) {
    const match = ref.part?.title.match(PART_TITLE);
    if (match == null) return null;
    const [, kind, plural, numbers] = match;
    if (noun != null && kind != noun) return null;
    noun = kind;
    let label = numbers;
    if (plural == "s") {
      // Its own "and" would read as the sentence's
      label = numbers.replace(/,?\s+and\s+/g, " & ");
      count += label.split(/\s*[&,]\s*/).length;
    } else {
      count += 1;
    }
    parts.push({ label, link: ref.link, pages: ref.part?.pages ?? null });
  }
  if (noun == null) return null;
  if (count > 1) noun += "s";
  return { noun, parts };
}

/** The separator before item `i` of `n` in "a, b, and c" / "a and b" */
export function listSeparator(i: number, n: number): string {
  if (i == 0) return "";
  if (n == 2) return " and ";
  if (i == n - 1) return ", and ";
  return ", ";
}
