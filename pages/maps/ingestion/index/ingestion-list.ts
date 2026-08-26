import h from "./ingestion-list.module.sass";
import { Intent, Menu, Tag } from "@blueprintjs/core";
import {
  ALL_CARDINALITIES,
  type ColumnSpec,
  ColumnFilterMenuItem,
  ColumnSortMenu,
  createDataCard,
  ctx,
  type FetchDataFilter,
  InlineFilterControl,
  MenuInlineFilterItem,
  type PostgrestFilter,
  standardizeFilter,
  storeAtom,
  TableAction,
  TableFilter,
  useSelector,
} from "@macrostrat/data-sheet";
import { RegionCardinality } from "@blueprintjs/table";
import classNames from "classnames";
import { type FilterURLBinding, ViewStateURLSync } from "~/components";
import {
  MapTagControl,
  tagColor,
  useDefinedTags,
  type TaggableMap,
} from "../components/map-tags";
import {
  CheckboxSetControl,
  ColoredTag,
  ControlsPopover,
  isSearchEmpty,
  OpenSearchControl,
  type SearchValue,
  SegmentedChoiceControl,
  YEAR_COMPARISONS,
  YearSelector,
  type YearValue,
} from "../components/controls";
import {
  activeFilterIdsAtom,
  activeSortCountAtom,
  clearSelectionAtom,
  clearSortsAtom,
  ingestStatesAtom,
  ingestYearsAtom,
  NO_STATUS,
  refreshRowsAtom,
  removeFiltersAtom,
  selectedMapsAtom,
  selectModeAtom,
  viewKeyAtom,
} from "./view-state";
import { atom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

/**
 * The map-ingestion queue list: view definition (columns, filters, sorts), the
 * toolbar's view controls, and the card renderer for `/maps/ingestion`, over the
 * `pg/maps` PostgREST route.
 *
 * The filter surface is deliberately *not* the generic operator forms: an
 * always-visible **open search** carries the common case (free text across
 * name / slug / id, plus a tag picker in the same control), and the remaining
 * facets are compact pickers in the Filter menu. Everything still flows through
 * the standard filter model — store `activeFilters` → the provider's
 * `translateFilter` — so the server does the work, and `urlBindings` makes any
 * particular view linkable.
 *
 * The presentational controls live in `../components/controls` (fully
 * controlled, no store access) and the coupled state in `./view-state` (jotai
 * atoms over the data-sheet store); this file is the wiring between them.
 */

export interface IngestMap {
  source_id: number;
  slug: string;
  name: string;
  url: string;
  ref_year: string;
  scale: string;
  state: string;
  tags: string[];
}

// ---- Open search: free text + tags, one control ----

export const SEARCH_FILTER_ID = "map-search";

function MapSearchForm({
  state,
  setState,
}: {
  state: SearchValue;
  setState: (s: SearchValue | null) => void;
}) {
  const { tags, failed } = useDefinedTags();
  let placeholder = "Search maps by name, ID, or tag…";
  let noResultsText = "No matching tags";
  if (failed) {
    placeholder = "Search maps by name or ID…";
    noResultsText = "Couldn't load tags";
  }
  return h(OpenSearchControl, {
    value: state,
    onChange: setState,
    tags,
    colorForTag: tagColor,
    placeholder,
    noResultsText,
  });
}

export const searchFilter: TableFilter<IngestMap, SearchValue> = {
  id: SEARCH_FILTER_ID,
  name: "Search",
  icon: "search",
  defaultState: { text: "", tags: [] },
  presentation: "inline",
  describeState: (s) => {
    const parts: string[] = [];
    if ((s?.text ?? "").trim() !== "") parts.push(s.text.trim());
    const n = s?.tags?.length ?? 0;
    if (n === 1) parts.push(s.tags[0]);
    if (n > 1) parts.push(`${n} tags`);
    if (parts.length === 0) return null;
    return parts.join(" + ");
  },
  filterForm: MapSearchForm,
  // Client-side predicate, for an in-memory source; the live page filters
  // server-side via `translateFilter`.
  predicate: (row, s) => {
    const q = (s?.text ?? "").trim().toLowerCase();
    const tags = s?.tags ?? [];
    const textOK =
      q === "" ||
      [row?.name, row?.slug, String(row?.source_id ?? "")].some((v) =>
        v?.toLowerCase?.().includes(q)
      );
    const tagsOK =
      tags.length === 0 ||
      (Array.isArray(row?.tags) && tags.some((t) => row.tags.includes(t)));
    return textOK && tagsOK;
  },
};

// ---- Status (`state`) ----
// The queue's primary triage facet. Its values come from the live route (see
// `ingestStatesAtom`), not a hard-coded enum, and a quarter of the queue has no
// status at all — so "(none)" is an explicit option.

export const STATUS_FILTER_ID = "map-status";

interface StatusState {
  values: string[];
}

function StatusFilterForm({
  state,
  setState,
}: {
  state: StatusState;
  setState: (s: StatusState | null) => void;
}) {
  const states = useAtomValue(ingestStatesAtom);
  let options: string[] = [NO_STATUS];
  if (states.state === "hasData") options = states.data;

  return h(CheckboxSetControl, {
    options: options.map((value) => ({
      value,
      label: value.replace(/_/g, " "),
    })),
    value: state?.values ?? [],
    onChange: (values) => {
      if (values == null) {
        setState(null);
        return;
      }
      setState({ values });
    },
  });
}

export const statusFilter: TableFilter<IngestMap, StatusState> = {
  id: STATUS_FILTER_ID,
  name: "Status",
  icon: "flow-review",
  columnKey: "state",
  defaultState: { values: [] },
  presentation: "menu-inline",
  describeState: (s) => {
    const n = s?.values?.length ?? 0;
    if (n === 0) return null;
    if (n === 1) return s.values[0];
    return `${n} statuses`;
  },
  predicate: (row, s) => {
    const values = s?.values ?? [];
    if (values.length === 0) return true;
    if (row?.state == null) return values.includes(NO_STATUS);
    return values.includes(row.state);
  },
  filterForm: StatusFilterForm,
};

// ---- Scale ----
// A fixed four-value enum, so a segmented control beats the operator form. The
// state is still `{ operator, value }`, so the provider's default translation
// turns it into `scale=eq.<value>` — a custom *UI* over the standard contract.
const SCALES = ["tiny", "small", "medium", "large"];

export const scaleFilter: TableFilter<
  IngestMap,
  { operator: "eq"; value: string | null }
> = {
  id: "scale-filter",
  name: "Scale",
  icon: "filter",
  columnKey: "scale",
  defaultState: { operator: "eq", value: null },
  presentation: "menu-inline",
  describeState: (s) => s?.value ?? null,
  predicate: (row, s) => s?.value == null || row.scale === s.value,
  filterForm: ({ state, setState }) =>
    h(SegmentedChoiceControl, {
      options: SCALES.map((value) => ({ value })),
      value: state?.value ?? null,
      onChange: (value) => setState({ operator: "eq", value }),
    }),
};

// ---- Year ----
// A comparison, but a trivial one — and worth keeping honest: `ref_year` is a
// text column carrying some junk, so the picker offers only years that actually
// occur in the data, with the comparison in plain words ("since 2015").
export const YEAR_FILTER_ID = "year-filter";

export const yearFilter: TableFilter<IngestMap, YearValue> = {
  id: YEAR_FILTER_ID,
  name: "Year",
  icon: "calendar",
  columnKey: "ref_year",
  defaultState: { operator: "eq", year: "" },
  presentation: "menu-inline",
  describeState: (s) => {
    if (s?.year == null || s.year === "") return null;
    const label = YEAR_COMPARISONS.find((c) => c.value === s.operator)?.label;
    return `${label ?? s.operator} ${s.year}`;
  },
  predicate: () => true,
  filterForm: YearFilterForm,
};

function YearFilterForm({
  state,
  setState,
}: {
  state: YearValue;
  setState: (s: YearValue | null) => void;
}) {
  const years = useAtomValue(ingestYearsAtom);
  let options: string[] = [];
  if (years.state === "hasData") options = years.data;
  return h(YearSelector, { years: options, value: state, onChange: setState });
}

/** Every filter this page offers, in toolbar order. */
export const ingestFilters: TableFilter<IngestMap>[] = [
  searchFilter,
  statusFilter,
  scaleFilter,
  yearFilter,
];

// Columns declare only what the *server* and the sort menu need. Filters are
// not declared here (nor passed as the panel's `filters`): this page renders its
// own view-control surface — see `ViewControls` — so the built-in Filter/Sort
// menus would only duplicate it.
export const columnSpec: ColumnSpec[] = [
  { key: "name", name: "Name", dataType: "text", sortable: true },
  { key: "state", name: "Status", dataType: "string", sortable: true },
  { key: "scale", name: "Scale", dataType: "string", sortable: true },
  { key: "ref_year", name: "Year", dataType: "integer", sortable: true },
  { key: "source_id", name: "Source ID", dataType: "integer", sortable: true },
  { key: "tags", name: "Tags", dataType: "array" },
];

// ---- Server translation ----

/**
 * Toggle a tag in the open search's tag set. Clicking a tag on a card is the
 * fastest way to ask "what else looks like this?", so a card's chips drive the
 * same filter state the search bar's chips do — one place, either way in.
 */
export const toggleSearchTagAtom = atom(null, (get, _set, tag: string) => {
  const store = get(storeAtom);
  if (store == null) return;
  const current: SearchValue = store.activeFilters.get(SEARCH_FILTER_ID)
    ?.state ?? { text: "", tags: [] };
  const tags = current.tags.includes(tag)
    ? current.tags.filter((t) => t !== tag)
    : [...current.tags, tag];
  const next: SearchValue = { ...current, tags };
  if (isSearchEmpty(next)) {
    store.removeFilter(SEARCH_FILTER_ID);
    return;
  }
  store.setFilter(SEARCH_FILTER_ID, searchFilter, next);
});

/** Quote a value for use inside a PostgREST logic tree (`or=(…)`). */
function quoteLogicValue(value: string): string {
  return `"${String(value).replace(/"/g, "")}"`;
}

/**
 * Translate this page's filters into PostgREST query conditions. Only the two
 * filters that don't fit the scalar `columnKey=op.value` shape need a case; the
 * rest fall through to the standard translation.
 */
export function translateIngestFilter(
  f: FetchDataFilter
): PostgrestFilter | null {
  if (f.id === SEARCH_FILTER_ID) return translateSearch(f.state);
  if (f.id === STATUS_FILTER_ID) return translateStatus(f.state);
  if (f.id === YEAR_FILTER_ID) return translateYear(f.state);
  const s = f.state;
  const key = f.columnKey ?? s?.key;
  if (
    key == null ||
    s?.operator == null ||
    s?.value == null ||
    s.value === ""
  ) {
    return null;
  }
  return standardizeFilter({ key, operator: s.operator, value: s.value });
}

/** Free text → `or=(name.ilike.*q*, slug.ilike.*q*, source_id.eq.q)`;
 * tags → `tags=ov.{…}` ("has any of"). Both apply together (AND). */
function translateSearch(state: SearchValue): PostgrestFilter | null {
  const q = (state?.text ?? "").trim();
  const tags = state?.tags ?? [];
  if (q === "" && tags.length === 0) return null;
  return {
    type: "filter",
    apply: (req) => {
      let out = req;
      if (q !== "") {
        const like = quoteLogicValue(`*${q}*`);
        const parts = [`name.ilike.${like}`, `slug.ilike.${like}`];
        // A purely numeric query also matches an exact source_id.
        if (/^\d+$/.test(q)) parts.push(`source_id.eq.${q}`);
        out = out.or(parts.join(","));
      }
      if (tags.length > 0) out = out.overlaps("tags", tags);
      return out;
    },
  };
}

/** A year comparison → `ref_year=<op>.<year>`. */
function translateYear(state: YearValue): PostgrestFilter | null {
  if (state?.year == null || state.year === "") return null;
  if (!YEAR_COMPARISONS.some((c) => c.value === state.operator)) return null;
  return standardizeFilter({
    key: "ref_year",
    operator: state.operator as any,
    value: state.year,
  });
}

/** A set of statuses → `state=in.(…)`, with the null case folded in via `or`. */
function translateStatus(state: StatusState): PostgrestFilter | null {
  const values = state?.values ?? [];
  if (values.length === 0) return null;
  const named = values.filter((v) => v !== NO_STATUS);
  const includeNull = values.includes(NO_STATUS);
  return {
    type: "filter",
    apply: (req) => {
      if (!includeNull) return req.in("state", named);
      if (named.length === 0) return req.is("state", null);
      const list = named.map(quoteLogicValue).join(",");
      return req.or(`state.in.(${list}),state.is.null`);
    },
  };
}

// ---- URL bindings ----
// Filter + sort state is mirrored into the query string, so a particular view
// ("failed maps tagged Arizona AZGS, newest first") is a link. Empty values are
// omitted, keeping a default view's URL clean.

export const urlBindings: FilterURLBinding[] = [
  {
    filter: searchFilter,
    params: ["q", "tags"],
    toParams: (s: SearchValue) => ({
      q: s?.text?.trim() || null,
      tags: (s?.tags ?? []).join(",") || null,
    }),
    fromParams: ({ q, tags }) => {
      const state: SearchValue = {
        text: q ?? "",
        tags: (tags ?? "").split(",").filter(Boolean),
      };
      if (isSearchEmpty(state)) return null;
      return state;
    },
  },
  {
    filter: statusFilter,
    params: ["status"],
    toParams: (s: StatusState) => ({
      status: (s?.values ?? []).join(",") || null,
    }),
    fromParams: ({ status }) => {
      const values = (status ?? "").split(",").filter(Boolean);
      if (values.length === 0) return null;
      return { values };
    },
  },
  {
    filter: scaleFilter,
    params: ["scale"],
    toParams: (s) => ({ scale: s?.value || null }),
    fromParams: ({ scale }) => {
      if (scale == null || scale === "") return null;
      return { operator: "eq", value: scale };
    },
  },
  {
    filter: yearFilter,
    params: ["year"],
    toParams: (s: YearValue) => {
      if (s?.year == null || s.year === "") return { year: null };
      return { year: `${s.operator}.${s.year}` };
    },
    fromParams: ({ year }) => {
      if (year == null || year === "") return null;
      const idx = year.indexOf(".");
      if (idx < 0) return { operator: "eq", year };
      const operator = year.slice(0, idx);
      // A hand-edited URL shouldn't be able to send a junk operator to the
      // server; anything unrecognized falls back to equality.
      if (!YEAR_COMPARISONS.some((c) => c.value === operator)) {
        return { operator: "eq", year };
      }
      return { operator, year: year.slice(idx + 1) };
    },
  },
];

// ---- View controls (filter + sort), modal on selection ----

const MENU_FILTERS = ingestFilters.filter(
  (f) => (f.presentation ?? "menu") !== "inline"
);
const INLINE_FILTERS = ingestFilters.filter(
  (f) => (f.presentation ?? "menu") === "inline"
);
const MENU_FILTER_IDS = MENU_FILTERS.map((f) => f.id);

function FilterMenuItems() {
  return MENU_FILTERS.map((filter) => {
    if ((filter.presentation ?? "menu") === "menu-inline") {
      return h(MenuInlineFilterItem, {
        key: filter.id,
        filter,
        label: filter.name,
      });
    }
    return h(ColumnFilterMenuItem, {
      key: filter.id,
      filter,
      label: filter.name,
    });
  });
}

function SortMenuItems() {
  const columnSpec = useSelector((s: any) => s.columnSpec);
  return columnSpec
    .filter((col: ColumnSpec) => col.sortable)
    .map((col: ColumnSpec) =>
      h(ColumnSortMenu, { key: col.key, columnKey: col.key, text: col.name })
    );
}

/** A "Filter"/"Sort" dropdown tag, active when it has something set. */
function ViewStateTag({ icon, label, count, onClear, content }) {
  const active = count > 0;
  let rightIcon: "caret-down" | undefined = "caret-down";
  let onRemove: any = undefined;
  if (active) {
    rightIcon = undefined;
    onRemove = (event: any) => {
      onClear();
      event.stopPropagation();
    };
  }
  let intent: Intent = "none";
  if (active) intent = "primary";

  return h(
    ControlsPopover,
    { content },
    h(
      Tag,
      {
        minimal: true,
        large: true,
        interactive: true,
        icon,
        intent,
        rightIcon,
        onRemove,
      },
      label
    )
  );
}

/**
 * The page's own filter/sort surface, in place of the panel's built-in menus —
 * because it is **modal on selection**. Browsing, the controls are laid out in
 * the toolbar (open search + Filter + Sort). Once select mode is on, the
 * toolbar belongs to the selection and its actions, so the same controls
 * collapse behind one button — still reachable in a click, but no longer
 * competing with "3 maps · Tags" for attention or space.
 */
function ViewControls() {
  const selectMode = ctx.useValue(selectModeAtom);
  const setSelectMode = ctx.useSet(selectModeAtom);
  const activeFilterIds = ctx.useValue(activeFilterIdsAtom);
  const activeSorts = ctx.useValue(activeSortCountAtom);
  const removeFilters = ctx.useSet(removeFiltersAtom);
  const clearSorts = ctx.useSet(clearSortsAtom);

  const filterCount = MENU_FILTER_IDS.filter((id) =>
    activeFilterIds.includes(id)
  ).length;

  // Selecting: the toolbar belongs to the selection, and changing the view would
  // invalidate it anyway (rows are addressed by index). So the whole control set
  // becomes one affordance that leaves select mode — "Filter" describes where it
  // takes you, which is the only reason you'd want it here.
  if (selectMode) {
    return h(
      Tag,
      {
        minimal: true,
        large: true,
        interactive: true,
        icon: "filter",
        title: "Filter and sort (leaves select mode)",
        onClick: () => setSelectMode(false),
      },
      "Filter"
    );
  }

  const inlineControls = INLINE_FILTERS.map((filter) =>
    h(InlineFilterControl, { key: filter.id, filter })
  );

  return h("div.view-controls", [
    ...inlineControls,
    h(ViewStateTag, {
      key: "filter",
      icon: "filter",
      label: "Filter",
      count: filterCount,
      onClear: () => removeFilters(MENU_FILTER_IDS),
      content: h(Menu, h(FilterMenuItems)),
    }),
    h(ViewStateTag, {
      key: "sort",
      icon: "sort",
      label: "Sort",
      count: activeSorts,
      onClear: clearSorts,
      content: h(Menu, h(SortMenuItems)),
    }),
  ]);
}

/** The view controls, as the toolbar action that replaces the built-in pair. */
export const viewControlsAction: TableAction<IngestMap> = {
  id: "view-controls",
  name: "View",
  icon: "filter-list",
  targets: ALL_CARDINALITIES,
  requiresEditable: false,
  render: () => h(ViewControls),
};

/** Suppresses the panel's built-in Sort menu (`ViewControls` renders its own).
 * Merging is by id, consumer-first, so this replaces it. */
export const suppressBuiltinSortAction: TableAction<IngestMap> = {
  id: "sort",
  name: "Sort",
  targets: ALL_CARDINALITIES,
  requiresEditable: false,
  render: () => null,
};

/**
 * A selection must not outlive the view it was made against: rows are addressed
 * by *index*, so a re-filter or re-sort leaves "rows 3–5" pointing at different
 * maps, and a bulk tag write would hit the wrong ones. The page's own controls
 * can't change the view while selecting (see `ViewControls`), but a linked or
 * back/forward navigation can — `ViewStateURLSync` applies it straight to the
 * store.
 *
 * `@macrostrat/data-sheet` 4.4.0 does this in the store for every consumer;
 * delete this once the app is on it.
 */
function SelectionViewGuard() {
  const viewKey = ctx.useValue(viewKeyAtom);
  const clearSelection = ctx.useSet(clearSelectionAtom);
  const previous = useRef(viewKey);

  useEffect(() => {
    if (previous.current === viewKey) return;
    previous.current = viewKey;
    clearSelection();
  }, [viewKey, clearSelection]);

  return null;
}

/** The page's in-provider effects: URL sync plus the selection guard. Mounted
 * as the data view's `children`, which render inside its provider. */
export function IngestListEffects() {
  return h([
    h(ViewStateURLSync, { key: "url", bindings: urlBindings }),
    h(SelectionViewGuard, { key: "guard" }),
  ]);
}

// ---- Cards ----

const STATE_INTENT: Record<string, Intent> = {
  failed: "danger",
  pending: "warning",
  processing: "primary",
  post_harmonization: "primary",
  "needs review": "warning",
  ingested: "success",
  succeeded: "success",
  abandoned: "none",
};

function MapCardContent({ data, selectable, onSelect }) {
  // Cmd/ctrl-click enters select mode and picks this map — the familiar list
  // idiom, and the way into a bulk action without first finding the toolbar's
  // Select control. In select mode the card is not a link at all
  // (`pointer-events: none` on the anchor), so this only fires while browsing.
  const setSelectMode = ctx.useSet(selectModeAtom);
  const toggleSearchTag = ctx.useSet(toggleSearchTagAtom);
  const onClick = (event: any) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    // Without this the click also reaches the card wrapper's own select
    // handler, which would toggle the row straight back off.
    event.stopPropagation();
    setSelectMode(true);
    onSelect({ additive: true });
  };

  return h(
    "a.map-card-content",
    {
      href: `/maps/ingestion/${data.source_id}`,
      className: classNames({ selectable }),
      onClick,
    },
    [
      h("div.card-header", [
        h("span.map-name", data.name ?? data.slug),
        h.if(data.state != null)(Tag, {
          minimal: true,
          intent: STATE_INTENT[data.state] ?? "none",
          children: data.state,
        }),
      ]),
      h("div.map-meta", [
        h.if(data.scale != null)(
          "span",
          { key: "scale" },
          `Scale: ${data.scale}`
        ),
        h.if(data.ref_year != null)("span", { key: "year" }, data.ref_year),
        h("span", `#${data.source_id}`),
      ]),
      h.if(Array.isArray(data.tags) && data.tags.length > 0)(
        "div.tags",
        (data.tags ?? []).map((t) =>
          h(ColoredTag, {
            key: t,
            name: t,
            color: tagColor(t),
            title: `Filter by "${t}"`,
            onClick: (event: any) => {
              // The card is a link; a tag click filters instead of navigating.
              event.preventDefault();
              event.stopPropagation();
              toggleSearchTag(t);
            },
          })
        )
      ),
    ]
  );
}

export const MapCard = createDataCard(MapCardContent, {
  className: h["map-card"],
});

/**
 * Selection-scoped tag action: select maps (cmd/shift-click, or the toolbar's
 * Select control), open **Tags** → one Blueprint tag list showing what the
 * selection carries, with add/remove in place. Writes go to the source_id-keyed
 * tag API (see `map-tags`) and re-fetch the queue.
 */
function SelectionTagControl() {
  const maps = ctx.useValue(selectedMapsAtom) as TaggableMap[];
  const refreshRows = ctx.useSet(refreshRowsAtom);
  // Presented inline rather than behind a button: while selecting, this *is*
  // what the toolbar is for, and the chips double as the read-out of what the
  // selection currently carries.
  return h(
    "div.selection-tags",
    h(MapTagControl, { maps, onChanged: refreshRows })
  );
}

export const tagEditAction: TableAction<IngestMap> = {
  id: "edit-tags",
  name: "Tags",
  icon: "tag",
  targets: [RegionCardinality.FULL_ROWS],
  requiresEditable: false,
  render: () => h(SelectionTagControl),
};
