/** The project filter's data model and pure helpers — importable from server
 * data hooks as well as components (no React here). See `state.ts`. */

export const PROJECT_FILTER_KEY = "project_id";

/** Selected projects as slugs (or numeric ids as strings); `null` = default. */
export type ProjectFilterValue = string[] | null;

/* ------------------------------------------------------------ URL form */

/** `north-america,caribbean` (or `1,7`) → `["north-america", "caribbean"]`. */
export function parseProjectFilter(value: unknown): ProjectFilterValue {
  if (value == null) return null;
  const parts = String(value)
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d !== "");
  return normalizeProjectFilter(parts);
}

export function serializeProjectFilter(value: ProjectFilterValue): string | null {
  const normalized = normalizeProjectFilter(value);
  if (normalized == null) return null;
  return normalized.join(",");
}

/** Dedupe; an empty list is the default (`null`). */
export function normalizeProjectFilter(
  value: ProjectFilterValue | undefined
): ProjectFilterValue {
  if (value == null) return null;
  const out = Array.from(new Set(value.filter((d) => d != null && d !== "")));
  if (out.length === 0) return null;
  return out;
}

/* --------------------------------------------------- project definitions */

export interface ProjectDef {
  project_id: number;
  slug?: string;
  project: string;
  descrip?: string;
  /** For a composite project, the projects it is built from. */
  members?: { id: number; name: string; slug?: string }[] | null;
  t_cols?: number;
  active_cols?: number;
}

/** The slug to use for a project in URLs, falling back to its id. */
export function projectSlug(def: ProjectDef | null | undefined): string | null {
  if (def == null) return null;
  return def.slug ?? def.project_id.toString();
}

/** Find a project definition by slug or numeric id. */
export function findProject(
  defs: ProjectDef[] | null | undefined,
  key: string | number
): ProjectDef | null {
  if (defs == null) return null;
  const text = String(key);
  return (
    defs.find((d) => d.slug === text || d.project_id.toString() === text) ??
    null
  );
}

/** Resolve the filter's slugs to the numeric ids the API accepts. Unknown
 * slugs are dropped; `null` when nothing is selected or nothing resolved. */
export function resolveProjectIDs(
  defs: ProjectDef[] | null | undefined,
  value: ProjectFilterValue
): number[] | null {
  if (value == null) return null;
  const ids: number[] = [];
  for (const key of value) {
    const def = findProject(defs, key);
    if (def != null) {
      ids.push(def.project_id);
      continue;
    }
    // A numeric id we don't know a definition for still stands
    const num = parseInt(key, 10);
    if (Number.isFinite(num) && String(num) === key) ids.push(num);
  }
  if (ids.length === 0) return null;
  return ids;
}

/** The API's `project_id` argument for a set of ids (`"1,7"`), or `null`. */
export function projectIDParam(ids: number[] | null): string | null {
  if (ids == null || ids.length === 0) return null;
  return ids.join(",");
}

