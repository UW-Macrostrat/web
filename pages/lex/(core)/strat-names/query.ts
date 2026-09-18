/** The PostgREST query for the stratigraphic name/concept list, shared by the
 * server seed (`+data.ts`) and the client provider (`+Page.ts`).
 *
 * `macrostrat_api.strat_combined` unions two things: one row per stratigraphic
 * *concept* (carrying its member names as comma-joined `strat_ids` /
 * `strat_names` / `strat_ranks`), and one row per stratigraphic *name that has
 * no concept* — a name that does belong to a concept is reachable only through
 * that concept's member list. `combined_id` is the concept id for the former
 * and `100000 + id` for the latter.
 */
export const STRAT_LIST_PAGE_SIZE = 50;

/** The searchable column: a concept's own name plus all of its member names,
 * so searching finds a concept through any name it covers. */
export const STRAT_SEARCH_COLUMN = "all_names";

/** Which half of the union to show. `null` is both. */
export type StratEntryType = "concepts" | "names";

export function stratListQuery({
  query,
  type,
  limit,
}: {
  query: string;
  type: StratEntryType | null;
  limit: number;
}): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(limit),
    order: "combined_id.asc",
  });
  if (query !== "") {
    params.set(STRAT_SEARCH_COLUMN, `ilike.*${query.replace(/[*"]/g, "")}*`);
  }
  // A concept row has no `id`; a standalone name row has one.
  if (type === "concepts") params.set("id", "is.null");
  if (type === "names") params.set("id", "not.is.null");
  return params;
}

export function parseStratEntryType(raw: string | null): StratEntryType | null {
  if (raw === "concepts" || raw === "names") return raw;
  return null;
}

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

export interface StratUsage {
  id: number;
  name: string;
  rank: string | null;
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
