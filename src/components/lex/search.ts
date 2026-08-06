/**
 * Cross-lexicon search: the data half of the `/lex` omnibar (the only search
 * surface — the homepage's inline result list was removed in favor of it).
 *
 * The backing route is the API v2 `defs/autocomplete` endpoint used by the
 * legacy Sift application. It returns *all* matches for a query at once,
 * grouped by entity type:
 *
 *     { lithologies: [{id, name, category}], strat_name_concepts: [...], ... }
 *
 * Note: the previous implementation hit `${postgrestPrefix}/autocomplete`,
 * a view that exists only on local/dev databases — the homepage search was
 * dead in production. `defs/autocomplete` is the deployed route.
 *
 * Results are *categorized* rather than tagged per row: matches are ordered into
 * sections (one per entity type, subdivided by hierarchy for lithologies /
 * environments / intervals), which is both less repetitive than a type tag on
 * every row and closer to how the lexicon is actually organized. The hierarchy
 * and the color/age detail come from joining the (small, cached) definition
 * tables that `MacrostratDataProvider` already manages.
 */
import { apiV2Prefix } from "@macrostrat-web/settings";

export interface LexSearchGroup {
  /** Human-readable singular label for the entity type. */
  label: string;
  /** Section heading (plural). */
  pluralLabel: string;
  /** Route prefix for an item's detail page; `${hrefBase}/${id}`. */
  hrefBase: string;
  /** Which definition table to join for color / hierarchy / age detail. */
  join?: LexDefsKey;
}

export type LexDefsKey = "lithologies" | "environments" | "intervals";

/**
 * The autocomplete response's group keys, mapped to labels, a detail route, and
 * (where one exists) the definition table to join against.
 *
 * Keys absent from this map are dropped from the results: `defs/autocomplete`
 * also returns `environment_classes`, `econ_types`, and `groups`, none of which
 * have a per-item page to navigate to. Add an entry here once one exists.
 */
export const LEX_SEARCH_GROUPS: Record<string, LexSearchGroup> = {
  lithologies: {
    label: "Lithology",
    pluralLabel: "Lithologies",
    hrefBase: "/lex/lithologies",
    join: "lithologies",
  },
  lithology_attributes: {
    label: "Lithology attribute",
    pluralLabel: "Lithology attributes",
    hrefBase: "/lex/lith-atts",
  },
  intervals: {
    label: "Interval",
    pluralLabel: "Intervals",
    hrefBase: "/lex/intervals",
    join: "intervals",
  },
  environments: {
    label: "Environment",
    pluralLabel: "Environments",
    hrefBase: "/lex/environments",
    join: "environments",
  },
  strat_name_concepts: {
    label: "Stratigraphic concept",
    pluralLabel: "Stratigraphic concepts",
    hrefBase: "/lex/strat-concepts",
  },
  strat_name_orphans: {
    label: "Stratigraphic name",
    pluralLabel: "Stratigraphic names",
    hrefBase: "/lex/strat-names",
  },
  econs: {
    label: "Economic use",
    pluralLabel: "Economic uses",
    hrefBase: "/lex/economics",
  },
  minerals: {
    label: "Mineral",
    pluralLabel: "Minerals",
    hrefBase: "/lex/minerals",
  },
  structures: {
    label: "Structure",
    pluralLabel: "Structures",
    hrefBase: "/lex/structures",
  },
  columns: { label: "Column", pluralLabel: "Columns", hrefBase: "/columns" },
  projects: {
    label: "Project",
    pluralLabel: "Projects",
    hrefBase: "/projects",
  },
};

/** Group display order — lexicon definitions first, then columns/projects. */
const GROUP_ORDER: string[] = Object.keys(LEX_SEARCH_GROUPS);

export interface LexSearchResult {
  /** Stable row identity (`id` alone collides across types). */
  key: string;
  id: number;
  name: string;
  /** The autocomplete group key (e.g. `strat_name_concepts`). */
  type: string;
  /** The API's own coarse category (e.g. `strat_name`). */
  category: string;
  /** Label for `type`, from `LEX_SEARCH_GROUPS`. */
  label: string;
  href: string;
}

/** Shortest query the endpoint is worth hitting with. */
export const MIN_QUERY_LENGTH = 2;

const searchCache = new Map<string, LexSearchResult[]>();

/**
 * Fetch and flatten cross-lexicon matches for `query`. Results are cached per
 * normalized query for the lifetime of the page — the endpoint's response for a
 * given prefix is stable, and the omnibar re-requests as the user types.
 */
export async function fetchLexSearch(
  query: string,
  signal?: AbortSignal
): Promise<LexSearchResult[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const cached = searchCache.get(q.toLowerCase());
  if (cached != null) return cached;

  const url = `${apiV2Prefix}/defs/autocomplete?query=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const body = await res.json();
  const data = body?.success?.data ?? {};

  const rows: LexSearchResult[] = [];
  for (const type of GROUP_ORDER) {
    const group = LEX_SEARCH_GROUPS[type];
    for (const item of data[type] ?? []) {
      rows.push({
        key: `${type}:${item.id}`,
        id: item.id,
        name: item.name,
        type,
        category: item.category,
        label: group.label,
        href: `${group.hrefBase}/${item.id}`,
      });
    }
  }

  searchCache.set(q.toLowerCase(), rows);
  return rows;
}

/* ------------------------------------------------------------------ *
 * Joining + categorization
 * ------------------------------------------------------------------ */

/** The definition maps (id → record) from `MacrostratDataProvider`. */
export type LexDefs = Partial<Record<LexDefsKey, Map<number, any> | null>>;

export interface LexSearchItem extends LexSearchResult {
  /** The joined definition record, when the type has one. */
  def: any | null;
  /** Tag color, from the joined record. */
  color?: string;
  /** Small qualifier shown beside the name (lithology/environment type, or an
   * interval's age range). */
  details?: string;
  /** Section this row belongs to. */
  section: string;
}

/** `541–485.4 Ma` — the interval's age range, from the joined definition. */
export function formatAgeRange(def: any): string | undefined {
  const { b_age, t_age } = def ?? {};
  if (b_age == null || t_age == null) return undefined;
  return `${formatAge(b_age)}–${formatAge(t_age)} Ma`;
}

function formatAge(age: number): string {
  if (age === 0) return "0";
  if (age < 1) return age.toPrecision(2);
  return String(Math.round(age * 10) / 10);
}

/**
 * Join each match to its definition record and assign it a section. Sections are
 * the entity type, subdivided by hierarchy where the definitions carry one:
 * lithology / environment `class`, and interval `int_type`.
 */
export function categorizeLexResults(
  rows: LexSearchResult[],
  defs: LexDefs
): LexSearchItem[] {
  const items = rows.map((row) => decorate(row, defs));

  // Order by group, then by section within the group, preserving the API's
  // ordering within a section. The omnibar's keyboard navigation follows this
  // array, so visual order and item order must agree.
  const groupIndex = new Map(GROUP_ORDER.map((type, i) => [type, i]));
  const sectionOrder = new Map<string, number>();
  items.forEach((item) => {
    if (!sectionOrder.has(item.section)) {
      sectionOrder.set(item.section, sectionOrder.size);
    }
  });

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const byGroup =
        groupIndex.get(a.item.type) - groupIndex.get(b.item.type) ||
        sectionOrder.get(a.item.section) - sectionOrder.get(b.item.section);
      if (byGroup !== 0) return byGroup;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function decorate(row: LexSearchResult, defs: LexDefs): LexSearchItem {
  const group = LEX_SEARCH_GROUPS[row.type];
  const def = group.join != null ? defs[group.join]?.get(row.id) : null;

  let details: string | undefined = undefined;
  let section = group.pluralLabel;

  if (def != null && group.join === "intervals") {
    details = formatAgeRange(def);
    if (def.int_type) section = `${group.pluralLabel} · ${def.int_type}`;
  } else if (def != null) {
    // Lithologies and environments share a `class` → `type` → name hierarchy.
    // The type is only worth showing when it isn't just the name again.
    if (def.type && def.type !== row.name) details = def.type;
    if (def.class) section = `${group.pluralLabel} · ${def.class}`;
  }

  return { ...row, def: def ?? null, color: def?.color, details, section };
}
