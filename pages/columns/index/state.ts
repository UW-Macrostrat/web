/** View state for the column list page.
 *
 * These atoms are seeded and read inside the hybrid frame's jotai scope (see
 * `HybridPage`'s `initialAtoms`), so every slot — the list, the map, the
 * filter controls, the details panel — shares one set of instances.
 */

import { atom } from "jotai";
import { atomWithStorage, unwrap } from "jotai/utils";
import { debounce } from "underscore";

import { postgrest } from "~/_providers";
import {
  getGroupedColumns,
  type ColumnFilterOptions,
  type ColumnGroup,
} from "./grouped-cols";

export type ColumnFilterKey =
  | "liths"
  | "stratNames"
  | "intervals"
  | "concepts"
  | "environments";

export interface ColumnFilterDef {
  type: ColumnFilterKey;
  identifier: number;
  name: string;
  color: string;
}

/** One row of the list: a column, flattened out of its group. */
export interface ColumnRow {
  col_id: number;
  col_name: string;
  col_group: string;
  col_group_id: number;
  project_id: number;
  status_code: string;
  lat: number;
  lng: number;
  col_area: number;
  refs: number[];
  t_units: number;
  t_sections: number;
  /** Resolved from the project definitions, for the list's section headers. */
  project_name: string;
}

export type MapBounds = [[number, number], [number, number]];

/* ------------------------------------------------------------ page inputs */

export const projectIDAtom = atom<number | null>(null);
export const initialDataAtom = atom<ColumnGroup[] | null>(null);
export const linkPrefixAtom = atom<string>("/");

/** Project definitions, loaded in `+data.ts` so a project section header has a
 * name on the first paint rather than a bare id. */
export const projectsAtom = atom<{ project_id: number; project: string }[]>([]);

export const projectNamesAtom = atom<Map<number, string>>((get) => {
  const map = new Map<number, string>();
  for (const project of get(projectsAtom)) {
    map.set(project.project_id, project.project);
  }
  return map;
});

/* ------------------------------------------------------ server-side filters */

export const columnFilterAtom = atom<ColumnFilterDef[]>([]);
export const showEmptyAtom = atom(true);
export const showInProcessAtom = atomWithStorage(
  "macrostrat:show-in-process",
  false
);
export const inputTextAtom = atom("");

export const addFilterAtom = atom(null, (_, set, data: ColumnFilterDef) => {
  set(columnFilterAtom, (value) => [...value, data]);
  set(inputTextAtom, "");
});

export const clearAllFiltersAtom = atom(null, (_get, set) => {
  set(columnFilterAtom, []);
});

const suggestedFiltersFetchAtom = atom(async (get) => {
  const inputText = get(inputTextAtom);
  if (inputText.length < 3) return [];
  return await fetchFilterItems(inputText);
});

export const suggestedFiltersAtom = unwrap(
  suggestedFiltersFetchAtom,
  (prev) => prev ?? []
);

const filterParamsAtom = atom((get) => {
  const filters = get(columnFilterAtom);
  const showEmpty = get(showEmptyAtom);
  const showInProcess = get(showInProcessAtom);
  const projectID = get(projectIDAtom);

  const params = buildParamsFromFilters(filters);

  if (projectID != null) {
    params.project_id = projectID;
  }
  if (!showEmpty) {
    params.empty = false;
  }
  if (!showInProcess) {
    params.status_code = "active";
  } else {
    params.status_code = "in process,active";
  }

  if (Object.keys(params).length === 0) return null;
  return params as ColumnFilterOptions;
});

const fetchDataAtom = atom(async (get) => {
  const filterParams = get(filterParamsAtom);
  return await instrumentResult(getGroupedColumns(filterParams));
});

const downloadedGroupsAtom = unwrap(fetchDataAtom, (prev) => ({
  data: prev?.data ?? null,
  error: prev?.error ?? null,
  loading: true,
}));

export const isLoadingAtom = atom((get) => get(downloadedGroupsAtom).loading);

/** Every column matching the *server-side* facets, flattened in group order.
 * This is what the panel gets as `data`; everything narrower (search, only
 * selected, only in map area) is a library-side `TableFilter`, so the panel owns
 * the filtered view and we mirror it back out (`visibleRowsAtom`). */
export const allRowsAtom = atom<ColumnRow[]>((get) => {
  const groups = get(downloadedGroupsAtom).data ?? get(initialDataAtom) ?? [];
  const projectNames = get(projectNamesAtom);
  return groups.flatMap((group) =>
    group.columns.map((col) => ({
      ...col,
      col_group: group.name,
      col_group_id: group.id,
      project_name:
        projectNames.get(col.project_id) ?? `Project ${col.project_id}`,
    }))
  ) as ColumnRow[];
});

/* ------------------------------------------------- selection & view filters */

/** The panel's post-filter rows, mirrored out by `VisibleRowsBridge` so the map
 * can draw the same set and range-selection can use the same order. Written by
 * the panel, read by everything else — never derived here, or the page and the
 * library would each be filtering. */
export const visibleRowsAtom = atom<ColumnRow[]>([]);

/** Selected columns, by `col_id`. The page — not the data panel — is the home
 * for this. The panel's own selection is index-based over the current filtered
 * rows and is dropped whenever a filter or sort changes (`dropRowSelection`),
 * neither of which a map-synced selection can tolerate. Sync to the panel is
 * therefore one-way: we push regions down for the selection-aware toolbar, and
 * never read them back. */
export const selectedColumnsAtom = atom<number[]>([]);

/** Anchor for shift-range selection (the last plain or additive click). */
const selectionAnchorAtom = atom<number | null>(null);

export interface SelectModifiers {
  additive?: boolean;
  range?: boolean;
}

/** The familiar list idiom, applied to `col_id`s over the visible order:
 * plain replaces, cmd/ctrl toggles one, shift extends from the anchor. */
export const selectColumnAtom = atom(
  null,
  (get, set, colID: number | null, mods: SelectModifiers = {}) => {
    if (colID == null) {
      set(selectedColumnsAtom, []);
      set(selectionAnchorAtom, null);
      return;
    }

    const order = get(visibleRowsAtom).map((row) => row.col_id);
    const anchor = get(selectionAnchorAtom);

    if (mods.range && anchor != null) {
      const from = order.indexOf(anchor);
      const to = order.indexOf(colID);
      if (from >= 0 && to >= 0) {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        set(selectedColumnsAtom, order.slice(lo, hi + 1));
        return;
      }
    }

    const current = get(selectedColumnsAtom);
    if (mods.additive) {
      let next: number[];
      if (current.includes(colID)) {
        next = current.filter((id) => id !== colID);
      } else {
        next = [...current, colID];
      }
      set(selectedColumnsAtom, next);
      set(selectionAnchorAtom, colID);
      return;
    }

    set(selectedColumnsAtom, [colID]);
    set(selectionAnchorAtom, colID);
  }
);

/** Selection is *modal*, and the mode is shared with the map: while it's off a
 * click — in the list or on a footprint — navigates to the column; while it's on
 * a click selects or deselects. One mode for both views, so the two never
 * disagree about what a click means. */
export const selectionModeAtom = atom(false);

/** Toggle one column in or out of the selection. The map's click path, and the
 * list's when a modifier isn't held. */
export const toggleColumnAtom = atom(null, (get, set, colID: number) => {
  const current = get(selectedColumnsAtom);
  if (current.includes(colID)) {
    set(
      selectedColumnsAtom,
      current.filter((id) => id !== colID)
    );
    return;
  }
  set(selectedColumnsAtom, [...current, colID]);
  set(selectionAnchorAtom, colID);
});

export const clearSelectionAtom = atom(null, (_get, set) => {
  set(selectedColumnsAtom, []);
  set(selectionAnchorAtom, null);
});

/** The map viewport, republished on every settled move. Read by the
 * "only in map area" filter while it's active. */
export const mapBoundsAtom = atom<MapBounds | null>(null);

export function withinBounds(row: ColumnRow, bounds: MapBounds): boolean {
  const [[west, south], [east, north]] = bounds;
  if (row.lat == null || row.lng == null) return false;
  if (row.lat < south || row.lat > north) return false;
  // A map panned across the antimeridian reports west > east.
  if (west <= east) return row.lng >= west && row.lng <= east;
  return row.lng >= west || row.lng <= east;
}

/* ------------------------------------------------------------ lex filter IO */

async function _fetchFilterItems(inputText: string) {
  const { data } = await postgrest
    .from("col_filters")
    .select("*")
    .ilike("name", `%${inputText}%`)
    .limit(5);
  return data ?? [];
}

const fetchFilterItems = debounce(_fetchFilterItems, 300);

export function routeForFilterKey(key: ColumnFilterKey): string {
  switch (key) {
    case "liths":
      return "lithologies";
    case "stratNames":
      return "strat-names";
    case "intervals":
      return "intervals";
    case "concepts":
      return "concepts";
    case "environments":
      return "environments";
  }
}

export function filterKeyFromType(type: string): ColumnFilterKey | null {
  switch (type) {
    case "lithology":
      return "liths";
    case "strat name":
      return "stratNames";
    case "interval":
      return "intervals";
    case "concept":
      return "concepts";
    case "environment":
      return "environments";
    default:
      return null;
  }
}

function paramNameForFilterKey(
  key: ColumnFilterKey
): keyof ColumnFilterOptions {
  switch (key) {
    case "liths":
      return "liths";
    case "stratNames":
      return "strat_names";
    case "intervals":
      return "intervals";
    case "concepts":
      return "strat_name_concepts";
    case "environments":
      return "environments";
  }
}

function buildParamsFromFilters(
  filters: ColumnFilterDef[]
): Partial<ColumnFilterOptions> {
  const filterData: Partial<ColumnFilterOptions> = {};
  if (filters == null) return filterData;
  for (const filter of filters) {
    const key = paramNameForFilterKey(filter.type);
    if (key == "strat_names" || key == "strat_name_concepts") {
      filterData[key] ??= [];
    } else {
      filterData[key] = [];
    }
    filterData[key].push(filter.identifier);
  }
  return filterData;
}

async function instrumentResult<T>(promise: Promise<T>) {
  try {
    return { data: await promise, error: null, loading: false };
  } catch (e) {
    return { data: null, error: e, loading: false };
  }
}
