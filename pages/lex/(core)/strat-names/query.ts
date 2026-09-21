/** The PostgREST queries behind the stratigraphic name/concept list, shared by
 * the server seed (`+data.ts`) and the client provider (`+Page.ts`).
 *
 * The list has **two sources**, chosen by the scope control:
 *
 * - `macrostrat_api.strat_combined` (scopes `all` and `concepts`) unions one
 *   row per stratigraphic *concept* — carrying its member names as
 *   comma-joined `strat_ids` / `strat_names` / `strat_ranks` — with one row per
 *   stratigraphic name that has **no** concept. `combined_id` is the concept id
 *   for the former and `100000 + id` for the latter.
 * - `macrostrat_api.strat_names` (scope `names`) is every stratigraphic name,
 *   all 51,229 of them, including the ~48k that belong to a concept and are
 *   therefore not rows of their own in `strat_combined`. This is what makes
 *   "Names" mean *all* names rather than *unaffiliated* names.
 *
 * Both are ordered **alphabetically** rather than by id. In `strat_combined`
 * that matters twice over: `combined_id` sorts every concept ahead of every
 * name (the name half began 43k rows down), so ordering by `name` is what makes
 * the unscoped list browsable at all.
 *
 * `strat_combined` is defined only in `schema/_dev_definitions` and answers 404
 * in production; `strat_names` is deployed. See [[Geologic lexicon pages]].
 */
export const STRAT_LIST_PAGE_SIZE = 50;

/** Which source and scope the list is showing. `null` is the whole of
 * `strat_combined` — concepts plus unaffiliated names, interleaved. */
export type StratEntryType = "concepts" | "names";

/** The concept source's searchable column: a concept's own name plus all of its
 * member names, so searching finds a concept through any name it covers. */
export const STRAT_SEARCH_COLUMN = "all_names";

/** The name source's searchable column. */
export const STRAT_NAME_SEARCH_COLUMN = "strat_name";

export const STRAT_COMBINED_TABLE = "strat_combined";
export const STRAT_NAMES_TABLE = "strat_names";

/** Which table a scope reads. Only `names` leaves `strat_combined`. */
export function stratListTable(type: StratEntryType | null): string {
  if (type === "names") return STRAT_NAMES_TABLE;
  return STRAT_COMBINED_TABLE;
}

export function stratListQuery({
  query,
  type,
  limit,
}: {
  query: string;
  type: StratEntryType | null;
  limit: number;
}): URLSearchParams {
  const params = new URLSearchParams({ limit: String(limit) });
  const text = query.replace(/[*"]/g, "");

  if (type === "names") {
    // Alphabetical, with the id as the (unique) tiebreaker keyset paging needs.
    params.set("order", "strat_name.asc,id.asc");
    if (text !== "") {
      params.set(STRAT_NAME_SEARCH_COLUMN, `ilike.*${text}*`);
    }
    return params;
  }

  params.set("order", "name.asc,combined_id.asc");
  if (text !== "") {
    params.set(STRAT_SEARCH_COLUMN, `ilike.*${text}*`);
  }
  // A concept row has no `id`; a standalone name row has one.
  if (type === "concepts") params.set("id", "is.null");
  return params;
}

export function parseStratEntryType(raw: string | null): StratEntryType | null {
  if (raw === "concepts" || raw === "names") return raw;
  return null;
}

/** A row of `strat_combined`. */
export interface StratCombinedRow {
  combined_id: number;
  /** Set on a concept row. */
  concept_id: number | null;
  /** Set on a standalone (concept-less) stratigraphic name row. */
  id: number | null;
  name: string;
  rank: string | null;
  /** Comma-joined member names of a concept, parallel to `strat_ids`. */
  strat_names: string | null;
  strat_ids: string | null;
  strat_ranks: string | null;
  all_names: string;
}

/** A row of `strat_names`. */
export interface StratNameRow {
  id: number;
  concept_id: number | null;
  strat_name: string;
  rank: string | null;
  ref_id: number | null;
}

export type StratListRow = StratCombinedRow | StratNameRow;

export interface StratUsage {
  id: number;
  name: string;
  rank: string | null;
}

/** One entry of the list, in the shape a card renders — so the two sources'
 * differing row shapes are reconciled once, here, rather than in the card. */
export interface StratEntry {
  kind: "concept" | "name";
  /** Stable across sources: a concept and a name can share a numeric id. */
  key: string;
  /** The concept id or the stratigraphic name id, per `kind`. */
  id: number;
  name: string;
  rank: string | null;
  /** The concept a *name* belongs to, when it has one. Only the `names` scope
   * can carry this — `strat_combined`'s name rows are the concept-less ones. */
  conceptId: number | null;
  /** A concept's member names. Empty for a name. */
  usages: StratUsage[];
}

export function stratEntry(row: StratListRow): StratEntry {
  if (isStratName(row)) {
    return {
      kind: "name",
      key: `n${row.id}`,
      id: row.id,
      name: row.strat_name,
      rank: row.rank,
      conceptId: row.concept_id,
      usages: [],
    };
  }

  if (row.id != null) {
    return {
      kind: "name",
      key: `n${row.id}`,
      id: row.id,
      name: row.name,
      rank: row.rank,
      conceptId: null,
      usages: [],
    };
  }

  return {
    kind: "concept",
    key: `c${row.concept_id}`,
    id: row.concept_id,
    name: row.name,
    rank: null,
    conceptId: null,
    usages: conceptUsages(row),
  };
}

/** `strat_names` rows carry `strat_name`; `strat_combined` rows carry `name`. */
function isStratName(row: StratListRow): row is StratNameRow {
  return (row as StratNameRow)?.strat_name != null;
}

/** A concept's member names, zipped back out of the view's parallel
 * comma-joined columns. */
export function conceptUsages(row: StratCombinedRow): StratUsage[] {
  const ids = splitList(row.strat_ids);
  if (ids.length === 0) return [];
  const names = splitList(row.strat_names);
  const ranks = splitList(row.strat_ranks);
  return ids.map((id, i) => ({
    id: Number(id),
    name: names[i] ?? "",
    rank: ranks[i] ?? null,
  }));
}

function splitList(value: string | null): string[] {
  if (value == null || value === "") return [];
  return value.split(",");
}
