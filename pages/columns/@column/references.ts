import type { RawReference } from "@macrostrat/data-components";

/** One citation of a column, as v2 `/columns?response=long` returns it in
 * `refs_expanded`. */
export interface ExpandedRef {
  ref_type: string;
  label: string;
  ref_id: number;
  citation: string;
  doi: string | null;
  url: string | null;
  locator: string | null;
  locator_url: string | null;
}

export interface Locator {
  text: string;
  url: string | null;
}

/** A reference cited with a verb, or at locators within it ("Compiled in …:
 * Cenoz11, Cret17a"). */
export interface LocatedReference {
  label: string;
  ref: RawReference;
  locators: Locator[];
}

export interface ColumnReferences {
  /** Plain citations, compacted the way the lexicon lists them */
  cited: RawReference[];
  located: LocatedReference[];
}

/** Splits the column's references into plain citations and those with a verb or
 * locators. `refIDs` and `refText` are v2's (`refs` on the column, and its
 * formatted text keyed by id); without `expanded`, which an API that predates
 * reference verbs leaves out, every reference is plain. */
export function assembleColumnReferences(
  refIDs: number[] | null | undefined,
  refText: Record<string, string> | null | undefined,
  expanded: ExpandedRef[] | null | undefined
): ColumnReferences {
  const text = refText ?? {};
  const ids = refIDs ?? Object.keys(text).map(Number);
  const links = expanded ?? [];

  const located = new Map<string, LocatedReference>();
  const plainIDs = new Set<number>();
  for (const link of links) {
    if (link.ref_type == "unspecified" && link.locator == null) {
      plainIDs.add(link.ref_id);
      continue;
    }
    const key = `${link.ref_id}:${link.ref_type}`;
    let entry = located.get(key);
    if (entry == null) {
      entry = {
        label: link.label,
        ref: { id: link.ref_id, text: text[link.ref_id] ?? link.citation },
        locators: [],
      };
      located.set(key, entry);
    }
    if (link.locator != null) {
      entry.locators.push({ text: link.locator, url: link.locator_url });
    }
  }

  let isPlain = (id: number) => plainIDs.has(id);
  if (links.length == 0) {
    isPlain = () => true;
  }
  const cited = ids
    .filter((id) => text[id] != null && isPlain(id))
    .map((id) => ({ id, text: text[id] }));

  return { cited, located: Array.from(located.values()) };
}
