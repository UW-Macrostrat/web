/** View state for the column list page.
 *
 * These atoms are seeded and read inside the hybrid frame's jotai scope (see
 * `HybridPage`'s `initialAtoms`), so every slot — the list, the map, the
 * filter controls, the details panel — shares one set of instances.
 */

import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  COLUMN_STATUS_FILTER_KEY,
  statusCodeParam,
  statusCodeURLValue,
} from "~/components/in-process-filter";
import {
  isMostlyInProcess,
  normalizeProjectFilter,
  projectIDParam,
  resolveProjectIDs,
  serializeProjectFilter,
  type ProjectDef,
  type ProjectFilterValue,
} from "~/components/project-filter";

import {
  buildDataViewSelection,
  getSelectedRowIndices,
  rowIndicesToRegions,
  type SelectModifiers,
} from "@macrostrat/data-sheet";
import { atom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { unwrap } from "jotai/utils";
import { debounce } from "underscore";

import { postgrest } from "~/_providers";
import {
  columnRequestParams,
  DEFAULT_REQUEST_SCOPE,
  getGroupedColumns,
  sameRequestParams,
  type ColumnFilterOptions,
  type ColumnGroup,
} from "./grouped-cols";
import { START_AFTER_KEY, type PageLocation } from "./page-links";
import { columnScopeHash } from "~/components/column-scope";

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

/** The project scope of the *request*: numeric id(s) as the API takes them,
 * comma-joined (`"1,7"`); `null` for the API's default set. */
export const projectIDAtom = atom<string | null>(null);

/** The shared project filter (`~/components/project-filter`) for this page,
 * as slugs. Writing it resolves the slugs to ids for the request (through the
 * loaded project definitions) and mirrors them to `?project_id=`, so the
 * choice is linkable and travels to the column and correlation pages. */
export const projectSlugsAtom = atom<ProjectFilterValue>(null);
const projectSearchParamAtom = atomWithSearchParam("project_id");
export const projectFilterAtom = atom(
  (get) => get(projectSlugsAtom),
  (get, set, value: ProjectFilterValue) => {
    const slugs = normalizeProjectFilter(value);
    set(projectSlugsAtom, slugs);
    set(projectIDAtom, projectIDParam(resolveProjectIDs(get(projectsAtom), slugs)));
    set(projectSearchParamAtom, serializeProjectFilter(slugs));
    // A different list: the crawl cursor no longer describes it
    set(startAfterParamAtom, null);
    if (isMostlyInProcess(get(projectsAtom), slugs)) {
      set(showInProcessAtom, true);
    }
  }
);

/* ------------------------------------------------------- crawlable paging */

/** The column the list starts after (`?after=`), read once at page load. The
 * panel drops it on the first view change; see `page-links.ts`. */
export const startAfterAtom = atom<number | null>(null);
/** The page's path and query as requested, for building page links. */
export const pageLocationAtom = atom<PageLocation | null>(null);
/** The `?after=` parameter itself — only ever *removed* by the client, when it
 * rewrites the URL for another reason, so a deep link never outlives the view
 * it described. */
export const startAfterParamAtom = atomWithSearchParam(START_AFTER_KEY);
/** The list the server rendered with, together with the request that produced
 * it. While the page's own request is the same one, this *is* the data — no
 * fetch is made — so the first client render is the server render, and the
 * first request only goes out when a control changes the scope. */
export interface InitialColumnData {
  params: ColumnFilterOptions;
  groups: ColumnGroup[];
}
export const initialDataAtom = atom<InitialColumnData | null>(null);
export const linkPrefixAtom = atom<string>("/");

/** Project definitions, loaded in `+data.ts` so a project section header has a
 * name on the first paint rather than a bare id — and so the filter's slugs
 * can be resolved to ids. */
export const projectsAtom = atom<ProjectDef[]>([]);

export const projectNamesAtom = atom<Map<number, string>>((get) => {
  const map = new Map<number, string>();
  for (const project of get(projectsAtom)) {
    map.set(project.project_id, project.project);
  }
  return map;
});

/* ------------------------------------------------------ server-side filters */

export const columnFilterAtom = atom<ColumnFilterDef[]>([]);
export const showEmptyAtom = atom(DEFAULT_REQUEST_SCOPE.showEmpty);

/** The shared in-process filter (`~/components/in-process-filter`) for this
 * page. Read from the plain atom, seeded at page load; writing mirrors it to
 * `?status_code=` so the choice is linkable and travels to the column and
 * correlation pages — the same one-way arrangement as the project filter.
 *
 * This used to be `atomWithStorage("macrostrat:show-in-process")`, remembered
 * per browser and invisible in the URL. A page-crossing scope that a link can
 * carry is worth more here than a remembered one, and it is what lets a link to
 * an in-process column arrive with the filter already on. */
export const showInProcessValueAtom = atom(
  DEFAULT_REQUEST_SCOPE.showInProcess
);
const statusCodeSearchParamAtom = atomWithSearchParam(
  COLUMN_STATUS_FILTER_KEY
);
export const showInProcessAtom = atom(
  (get) => get(showInProcessValueAtom),
  (get, set, value: boolean) => {
    set(showInProcessValueAtom, value);
    let param = statusCodeURLValue(value);
    // Off isn't the default for a mostly in-process project, so the URL says so
    if (!value && isMostlyInProcess(get(projectsAtom), get(projectSlugsAtom))) {
      param = statusCodeParam(false);
    }
    set(statusCodeSearchParamAtom, param);
    // A different list: the crawl cursor no longer describes it
    set(startAfterParamAtom, null);
  }
);
export const inputTextAtom = atom("");

export const addFilterAtom = atom(null, (_, set, data: ColumnFilterDef) => {
  set(columnFilterAtom, (value) => [...value, data]);
  set(inputTextAtom, "");
});

export const clearAllFiltersAtom = atom(null, (_get, set) => {
  set(columnFilterAtom, []);
});

/** Remove one lexicon facet (matched by type and identifier). */
export const removeFilterAtom = atom(null, (_get, set, data: ColumnFilterDef) => {
  set(columnFilterAtom, (value) =>
    value.filter(
      (d) => !(d.type === data.type && d.identifier === data.identifier)
    )
  );
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

  return columnRequestParams(
    { projectID, showEmpty, showInProcess },
    buildParamsFromFilters(filters)
  );
});

/** Resolves synchronously to the seeded data while the request is the one the
 * server already made (so `unwrap` below never enters a loading state for it),
 * and fetches only once the request differs. */
const fetchDataAtom = atom((get) => {
  const filterParams = get(filterParamsAtom);
  const seed = get(initialDataAtom);
  if (seed != null && sameRequestParams(seed.params, filterParams)) {
    return { data: seed.groups, error: null, loading: false };
  }
  return instrumentResult(getGroupedColumns(filterParams));
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
  const groups =
    get(downloadedGroupsAtom).data ?? get(initialDataAtom)?.groups ?? [];
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

/** Nothing selected, so the assistant has nothing to show (`HybridPage`). */
export const assistantIdleAtom = atom(
  (get) => get(selectedColumnsAtom).length === 0
);

export type { SelectModifiers };

/** The `col_id` that shift-range selections run from: the last item clicked
 * without shift. A ref, as in the data panel; derived so each store gets one. */
const selectionAnchorAtom = atom(() => ({ current: null as number | null }));

/** The data panel's selection rules (`buildDataViewSelection`), run over the
 * visible order. Selection and anchor stay `col_id`s so they survive filtering;
 * a cmd/ctrl change keeps selected columns the filter hides. */
export const selectColumnAtom = atom(
  null,
  (get, set, colID: number | null, mods: SelectModifiers = {}) => {
    const anchor = get(selectionAnchorAtom);
    if (colID == null) {
      set(selectedColumnsAtom, []);
      anchor.current = null;
      return;
    }

    const order = get(visibleRowsAtom).map((row) => row.col_id);
    const index = order.indexOf(colID);
    if (index < 0) {
      set(toggleColumnAtom, colID);
      return;
    }

    const current = get(selectedColumnsAtom);
    const visibleSelected = new Set(
      current.map((id) => order.indexOf(id)).filter((i) => i >= 0)
    );
    const indexRef = { current: positionOf(order, anchor.current) };
    const regions = buildDataViewSelection(
      index,
      mods,
      rowIndicesToRegions(visibleSelected),
      indexRef,
      true
    );

    const picked = getSelectedRowIndices(regions)
      .sort((a, b) => a - b)
      .map((i) => order[i]);
    let hidden: number[] = [];
    if (mods.additive) {
      hidden = current.filter((id) => !order.includes(id));
    }
    set(selectedColumnsAtom, [...hidden, ...picked]);
    anchor.current = null;
    if (indexRef.current != null) {
      anchor.current = order[indexRef.current];
    }
  }
);

function positionOf(order: number[], colID: number | null): number | null {
  if (colID == null) return null;
  const index = order.indexOf(colID);
  if (index < 0) return null;
  return index;
}

/** Selection is *modal*, and the mode is shared with the map: while it's off a
 * click — in the list or on a footprint — navigates to the column; while it's on
 * a click selects or deselects. One mode for both views, so the two never
 * disagree about what a click means. */
export const selectionModeAtom = atom(false);

/** Toggle one column in or out of the selection: the map's click path, which
 * has no order to range over, and a list click on a column outside it. */
export const toggleColumnAtom = atom(null, (get, set, colID: number) => {
  get(selectionAnchorAtom).current = colID;
  const current = get(selectedColumnsAtom);
  if (current.includes(colID)) {
    set(
      selectedColumnsAtom,
      current.filter((id) => id !== colID)
    );
    return;
  }
  set(selectedColumnsAtom, [...current, colID]);
});

export const clearSelectionAtom = atom(null, (get, set) => {
  set(selectedColumnsAtom, []);
  get(selectionAnchorAtom).current = null;
});

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


/** Builds a link to a column that carries the list's scope, so the column page
 * opens on the same projects and the same in-process setting — its navigation
 * map included. Every route out of the list uses this: the row's link, the
 * row's click, a footprint click on the map, the side panel's link. */
export function useColumnHref(): (colID: number) => string {
  const linkPrefix = useAtomValue(linkPrefixAtom);
  const projectSlugs = useAtomValue(projectSlugsAtom);
  const inProcess = useAtomValue(showInProcessValueAtom);
  const hash = columnScopeHash({ projectSlugs, inProcess });
  return useCallback(
    (colID: number) => `${linkPrefix}columns/${colID}${hash}`,
    [linkPrefix, hash]
  );
}
