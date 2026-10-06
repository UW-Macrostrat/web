/** A unit's lithologies and environments as the [[column-ingestion]] template
 * writes them, and back: the spreadsheet view's cells, and the export.
 *
 * - Lithologies: `<attribute>, <attribute> <lith> (<proportion>); …` — the
 *   attributes comma-separated before the name, the proportion a percentage
 *   or a term (`dom`, `sub`; the format's `major` / `minor` are read as
 *   those).
 * - Environments: names, `; `-separated.
 *
 * Reading text resolves each name against the vocabulary, case-insensitively.
 * The format admits terms Macrostrat doesn't know, so an unknown name is kept
 * — as an entry without an id, which validation flags — rather than dropped.
 * Pure functions.
 */
import type { UnitLong } from "@macrostrat/api-types";

type Lith = UnitLong["lith"][number] & { prop_term?: string | null };
type Environ = UnitLong["environ"][number];

/** A vocabulary as the reader needs it: definitions by lower-cased name. */
export type NameIndex<T> = Map<string, T>;

export function nameIndex<T extends { name: string }>(
  defs: Iterable<T>
): NameIndex<T> {
  const out = new Map<string, T>();
  for (const def of defs) out.set(normalize(def.name), def);
  return out;
}

/* ------------------------------------------------------------ lithology */

export function formatLithologies(liths: Lith[] | string | null | undefined) {
  if (liths == null) return "";
  if (typeof liths === "string") return liths;
  return liths.map(formatLithology).join("; ");
}

function formatLithology(d: Lith): string {
  let text = d.name ?? "";
  const atts = (d.atts ?? []).filter(Boolean);
  if (atts.length > 0) text = `${atts.join(", ")} ${text}`;
  const prop = formatProportionTerm(d);
  if (prop != null) text += ` (${prop})`;
  return text;
}

function formatProportionTerm(d: Lith): string | null {
  if (d.prop_term != null && d.prop_term !== "") return d.prop_term;
  if (d.prop == null || isNaN(d.prop)) return null;
  return `${Math.round(d.prop * 100)}%`;
}

/** Lithologies from the template's text. `attributes` are the known
 * attribute names, for splitting an unseparated run of words. */
export function parseLithologies(
  text: string,
  lithologies: NameIndex<any>,
  attributes: Set<string> = new Set()
): Lith[] {
  return splitList(text).map((part) =>
    parseLithology(part, lithologies, attributes)
  );
}

function parseLithology(
  part: string,
  lithologies: NameIndex<any>,
  attributes: Set<string>
): Lith {
  let body = part;
  let prop: number | null = null;
  let prop_term: string | null = null;
  const paren = body.match(/\(([^)]*)\)\s*$/);
  if (paren != null) {
    body = body.slice(0, paren.index).trim();
    ({ prop, prop_term } = parseProportion(paren[1]));
  }

  // The lithology is the longest run of words at the end that names one.
  // Naming none, it is what is left once the known attributes in front are
  // taken off — an unknown term is kept whole, not split at a guess.
  const words = body.replace(/,/g, ", ").split(/\s+/).filter(Boolean);
  let def: any = null;
  let split = leadingAttributeWords(words, attributes);
  for (let i = 0; i < words.length; i++) {
    const candidate = lithologies.get(normalize(words.slice(i).join(" ")));
    if (candidate != null) {
      def = candidate;
      split = i;
      break;
    }
  }
  const name = def?.name ?? words.slice(split).join(" ");
  const atts = parseAttributes(words.slice(0, split).join(" "), attributes);

  return {
    ...(def ?? {}),
    lith_id: def?.lith_id ?? null,
    name,
    atts,
    prop,
    prop_term,
  } as Lith;
}

/** A proportion as the format writes it: a percentage, a fraction, or a
 * term. */
function parseProportion(raw: string): {
  prop: number | null;
  prop_term: string | null;
} {
  const text = raw.trim().toLowerCase();
  if (text === "dom" || text === "major") return { prop: null, prop_term: "dom" };
  if (text === "sub" || text === "minor") return { prop: null, prop_term: "sub" };
  const percent = text.match(/^([\d.]+)\s*%$/);
  if (percent != null) return { prop: Number(percent[1]) / 100, prop_term: null };
  const num = Number(text);
  if (text !== "" && !isNaN(num)) {
    return { prop: num > 1 ? num / 100 : num, prop_term: null };
  }
  return { prop: null, prop_term: text || null };
}

/** How many of the leading words are known attributes (or end in a comma,
 * which only an attribute list does). */
function leadingAttributeWords(words: string[], known: Set<string>): number {
  let i = 0;
  while (i < words.length - 1) {
    if (words[i].endsWith(",")) {
      i += 1;
      continue;
    }
    let j = words.length - 1;
    while (j > i && !known.has(normalize(words.slice(i, j).join(" ")))) j -= 1;
    if (j === i) break;
    i = j;
  }
  return i;
}

/** Attributes, comma-separated; a run of words without commas is split into
 * the longest known attribute names, word by word where none match. */
function parseAttributes(text: string, known: Set<string>): string[] {
  const out: string[] = [];
  for (const chunk of text.split(",")) {
    const words = chunk.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length) {
      let j = words.length;
      while (j > i + 1 && !known.has(normalize(words.slice(i, j).join(" ")))) {
        j -= 1;
      }
      out.push(words.slice(i, j).join(" "));
      i = j;
    }
  }
  return out;
}

/* ---------------------------------------------------------- environment */

export function formatEnvironments(
  environs: Environ[] | string | null | undefined
) {
  if (environs == null) return "";
  if (typeof environs === "string") return environs;
  return environs.map((d) => d.name).join("; ");
}

export function parseEnvironments(
  text: string,
  environments: NameIndex<any>
): Environ[] {
  return splitList(text).map((name) => {
    const def = environments.get(normalize(name));
    return { ...(def ?? {}), environ_id: def?.environ_id ?? null, name: def?.name ?? name } as Environ;
  });
}

/* --------------------------------------------------------------- facies */

/** A unit's facies as the format writes them: `<facies> (<proportion>); …`,
 * the proportion a percentage or a term. `facies_id` names the facies when it
 * has an id, since that is what the facies sheet keys on. */
export type FaciesRef = {
  facies_id: string | null;
  name: string;
  prop: number | null;
  prop_term: string | null;
};

export function formatFacies(refs: FaciesRef[] | string | null | undefined) {
  if (refs == null) return "";
  if (typeof refs === "string") return refs;
  return refs.map(formatFaciesRef).join("; ");
}

function formatFaciesRef(d: FaciesRef): string {
  let text = d.facies_id ?? d.name ?? "";
  const prop = formatProportionTerm(d as any);
  if (prop != null) text += ` (${prop})`;
  return text;
}

/** Facies from the template's text, resolved against the scheme by id or
 * name. An unknown name is kept without an id, which validation flags. */
export function parseFacies(
  text: string,
  scheme: Map<string, { facies_id: string; facies: string }>
): FaciesRef[] {
  return splitList(text, /[;,](?![^()]*\))/).map((part) => {
    let body = part;
    let prop: number | null = null;
    let prop_term: string | null = null;
    const paren = body.match(/\(([^)]*)\)\s*$/);
    if (paren != null) {
      body = body.slice(0, paren.index).trim();
      ({ prop, prop_term } = parseProportion(paren[1]));
    }
    const def = scheme.get(normalize(body));
    return {
      facies_id: def?.facies_id ?? null,
      name: def?.facies ?? body,
      prop,
      prop_term,
    };
  });
}

/* ------------------------------------------------------------- checking */

/** The names in a list that Macrostrat's vocabulary doesn't hold. */
export function unresolvedNames(
  entries:
    | {
        name?: string;
        lith_id?: number | null;
        environ_id?: number | null;
        facies_id?: string | null;
      }[]
    | null
    | undefined,
  idField: "lith_id" | "environ_id" | "facies_id"
): string[] {
  if (!Array.isArray(entries)) return [];
  return entries.filter((d) => d?.[idField] == null).map((d) => d?.name ?? "");
}

function splitList(text: string, separator: string | RegExp = ";"): string[] {
  return String(text ?? "")
    .split(separator)
    .map((d) => d.trim())
    .filter(Boolean);
}

function normalize(name: string): string {
  return String(name ?? "").trim().toLowerCase();
}
