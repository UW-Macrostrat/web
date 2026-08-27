/** Filters for the column list, expressed as data-sheet `TableFilter`s so they
 * get the library's standard display: inline toolbar controls, the Filter menu,
 * and removable active-filter tags.
 *
 * Two of them depend on state that lives outside the panel (the page's column
 * selection; the map viewport). They carry that state in the filter's own
 * `state`, kept fresh from outside via `store.setFilter(...)` — the same seam
 * the map-ingestion list uses to drive its search from a card's tag chips. That
 * works precisely *because* selection is held at the page level: `setFilter`
 * drops the panel's row selection by design, which would otherwise make a
 * filter defined by the selection self-destroying.
 */

import { Icon, InputGroup } from "@blueprintjs/core";
import type { TableFilter } from "@macrostrat/data-sheet";

import h from "./main.module.sass";
import { withinBounds, type ColumnRow, type MapBounds } from "./state";

export const SEARCH_FILTER_ID = "column-search";
export const ONLY_SELECTED_FILTER_ID = "only-selected";
export const IN_MAP_AREA_FILTER_ID = "in-map-area";

/* ------------------------------------------------------------------ search */

interface SearchState {
  text: string;
}

function SearchForm({ state, setState }) {
  const text = state?.text ?? "";
  return h(InputGroup, {
    className: "search-input",
    leftIcon: "search",
    placeholder: "Search columns…",
    value: text,
    small: true,
    onChange: (evt) => setState({ text: evt.currentTarget.value }),
  });
}

export const searchFilter: TableFilter<ColumnRow, SearchState> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: { text: "" },
  // Always-visible toolbar control rather than a menu item — it's the one
  // control that's in use most of the time.
  presentation: "inline",
  filterForm: SearchForm,
  describeState: (s) => {
    const text = (s?.text ?? "").trim();
    if (text === "") return null;
    return text;
  },
  predicate: (row, s) => {
    const query = (s?.text ?? "").trim().toLowerCase();
    if (query === "") return true;
    return [row?.col_name, row?.col_group, String(row?.col_id ?? "")].some(
      (value) => value?.toLowerCase?.().includes(query)
    );
  },
};

/* ---------------------------------------------------------- only selected */

export interface OnlySelectedState {
  ids: number[];
}

function OnlySelectedForm({ state }) {
  const count = state?.ids?.length ?? 0;
  let label = `${count} selected`;
  if (count === 0) {
    label = "nothing selected";
  }
  return h("div.filter-note", [h(Icon, { icon: "select", size: 12 }), label]);
}

export const onlySelectedFilter: TableFilter<ColumnRow, OnlySelectedState> = {
  id: ONLY_SELECTED_FILTER_ID,
  name: "Only selected",
  icon: "select",
  defaultState: { ids: [] },
  presentation: "menu-inline",
  filterForm: OnlySelectedForm,
  describeState: (s) => `${s?.ids?.length ?? 0} columns`,
  predicate: (row, s) => (s?.ids ?? []).includes(row?.col_id),
};

/* --------------------------------------------------------- in map area */

export interface InMapAreaState {
  bounds: MapBounds | null;
}

function InMapAreaForm({ state }) {
  let label = "waiting for the map";
  if (state?.bounds != null) {
    label = "tracking the map view";
  }
  return h("div.filter-note", [h(Icon, { icon: "map", size: 12 }), label]);
}

export const inMapAreaFilter: TableFilter<ColumnRow, InMapAreaState> = {
  id: IN_MAP_AREA_FILTER_ID,
  name: "Only in map area",
  icon: "map",
  defaultState: { bounds: null },
  presentation: "menu-inline",
  filterForm: InMapAreaForm,
  describeState: () => "map view",
  predicate: (row, s) => {
    // Until the map reports a viewport, the filter is inert rather than empty.
    if (s?.bounds == null) return true;
    return withinBounds(row, s.bounds);
  },
};

export const columnTableFilters: TableFilter<ColumnRow, any>[] = [
  searchFilter,
  onlySelectedFilter,
  inMapAreaFilter,
];
