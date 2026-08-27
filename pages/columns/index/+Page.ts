/** The column list page, on the hybrid content/map frame.
 *
 * The list is a `DataPanel` over the whole matching column set held in memory
 * — one request, everything addressable — with a windowed, group-headed scroll
 * body. That's what lets the list and the map stay exactly in sync: selection
 * is by `col_id` at the page level, and the panel's index-based selection is
 * reconciled against it whenever the row set changes.
 */

import {
  AnchorButton,
  Button,
  ButtonGroup,
  Icon,
  Popover,
  Spinner,
  Switch,
  Tag,
} from "@blueprintjs/core";
import {
  DataPanel,
  DataPanelToolbarStyle,
  SelectionInteractionStyle,
  createLocalProvider,
  ctx,
  enableSelectionAtom,
  rowIndicesToRegions,
  selectionAtom,
  storeAtom,
  useSelector,
} from "@macrostrat/data-sheet";
import { DataField, Identifier } from "@macrostrat/data-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { useData } from "vike-react/useData";
import { navigate } from "vike/client/router";
import classNames from "classnames";

import { DevLinkButton, Link } from "~/components";
import { LithologyTag } from "~/components/lex/tag";
import { createWindowedScrollBody } from "~/components/data-view";
import { HybridContentFooter, HybridPage } from "~/layouts/hybrid";
import { onDemand } from "~/_utils";

import {
  columnTableFilters,
  inMapAreaFilter,
  IN_MAP_AREA_FILTER_ID,
  SEARCH_FILTER_ID,
  onlySelectedFilter,
  ONLY_SELECTED_FILTER_ID,
} from "./filters";
import {
  addFilterAtom,
  allRowsAtom,
  clearAllFiltersAtom,
  columnFilterAtom,
  filterKeyFromType,
  initialDataAtom,
  inputTextAtom,
  suggestedFiltersAtom,
  isLoadingAtom,
  linkPrefixAtom,
  mapBoundsAtom,
  projectIDAtom,
  projectsAtom,
  routeForFilterKey,
  selectColumnAtom,
  selectedColumnsAtom,
  selectionModeAtom,
  showEmptyAtom,
  showInProcessAtom,
  visibleRowsAtom,
  type ColumnFilterDef,
  type ColumnRow,
} from "./state";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const ColumnListMap = onDemand(() =>
  import("./map.client").then((mod) => mod.ColumnListMap)
);

/** Must match `.column-row` / `.group-header` in `main.module.sass` — the
 * windowed body positions rows absolutely, so it can't measure them. */
const ROW_HEIGHT = 30;
const GROUP_HEIGHT = 30;
const SECTION_HEIGHT = 34;

const ColumnScrollBody = createWindowedScrollBody<ColumnRow>({
  rowHeight: ROW_HEIGHT,
  // Projects are the outer sections (a handful, some very large); column groups
  // the inner ones (164 of them, median ~15 rows).
  sectionHeight: SECTION_HEIGHT,
  sectionOf: (row) => {
    if (row == null) return null;
    return {
      key: row.project_id,
      label: h(HeaderLabel, { name: row.project_name, id: row.project_id }),
    };
  },
  groupHeight: GROUP_HEIGHT,
  groupOf: (row) => {
    if (row == null) return null;
    return {
      key: row.col_group_id ?? -1,
      label: h(HeaderLabel, {
        name: row.col_group ?? "Ungrouped",
        id: row.col_group_id,
      }),
    };
  },
});

/** Rows per fetched page, and how many pages auto-load before the footer's
 * "Load more" takes over. Deep results are reached by narrowing the filters,
 * not by scrolling forever, so the checkpoint comes early — two pages in, which
 * also brings the footer within reach. */
const PAGE_SIZE = 100;
const AUTO_LOAD_PAGES = 2;

/** A paged in-memory provider whose row set can change underneath it without
 * the provider identity changing. Delegates to `createLocalProvider`, so filter
 * / sort / offset semantics stay the library's. */
function createPagedRowProvider(rowsRef: { current: ColumnRow[] }) {
  const identity = (row: ColumnRow) => row?.col_id;
  return {
    identity,
    fetchData(params: any) {
      return createLocalProvider<ColumnRow>(rowsRef.current, {
        identity: identity as any,
      }).fetchData(params);
    },
    distinctValues(columnKey: string, opts: any) {
      return createLocalProvider<ColumnRow>(rowsRef.current, {
        identity: identity as any,
      }).distinctValues!(columnKey, opts);
    },
  };
}

/** Name on the left, identifier right-aligned — the same shape at every level
 * of the list, so project, group and column read consistently. */
function HeaderLabel({ name, id }) {
  let identifier = null;
  if (id != null && id > 0) {
    identifier = h("span.header-identifier", h(Identifier, { id }));
  }
  return h([h("span.header-name", name), identifier]);
}

/** No `sortable` fields for now. The list is grouped project → group, and the
 * headers are emitted from consecutive runs — so a user sort silently
 * reinterprets them as different sections. Re-enable once the provider always
 * appends a project→group sort beneath whatever the user picks. */
const columnSpec = [
  { key: "col_id", name: "ID" },
  { key: "col_name", name: "Name", filterable: true },
  { key: "col_group", name: "Group", filterable: true },
  { key: "t_units", name: "Units", dataType: "integer" },
];

export function Page({ linkPrefix = "/" }) {
  const data = useData();
  const { project, allColumnGroups, projects } = data;
  // Match the id `+data.ts` fetched with — defaulting to something else meant
  // the client immediately refetched the list with different parameters.
  const projectID = project?.project_id ?? data.project_id ?? 1;

  return h(HybridPage, {
    capabilities: { defaultMode: "content-primary" },
    initialAtoms: [
      [projectIDAtom, projectID],
      [initialDataAtom, allColumnGroups],
      [linkPrefixAtom, linkPrefix],
      [projectsAtom, projects ?? []],
    ],
    content: h(ColumnList),
    map: h(ColumnListMap, { projectID }),
    assistant: h(ColumnAssistant),
  });
}

/* ----------------------------------------------------------------- the list */

function ColumnList() {
  const rows = useAtomValue(allRowsAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  // Paged, in-memory. `createLocalProvider` already implements filter + sort +
  // offset slicing over an array; passing it as an explicit `provider` (rather
  // than handing `DataPanel` the `data` prop) is what makes the panel treat it
  // as a real source and page it — with `data`, the panel sets its page size to
  // the row count and loads everything at once, which is exactly the
  // scroll-a-huge-array experience we don't want.
  //
  // The provider is created *once* and reads the rows through a ref. Memoizing
  // it on the array instead meant every recomputation of `allRowsAtom` — a
  // derived atom that mints a new array whenever anything upstream settles —
  // swapped the provider and reset the loader, so it never finished a page and
  // the list showed nothing but skeletons. Genuine changes to the row set are
  // signalled by `refreshToken` instead, which is derived from the *content*,
  // not the identity.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const provider = useMemo(() => createPagedRowProvider(rowsRef), []);

  const refreshToken = `${rows.length}`;

  if (isLoading && rows.length === 0) {
    return h("div.list-loading", h(Spinner));
  }

  return h(
    DataPanel<ColumnRow>,
    {
      className: "column-panel",
      name: "Columns",
      itemLabel: "column",
      provider,
      refreshToken,
      pageSize: PAGE_SIZE,
      autoLoadPages: AUTO_LOAD_PAGES,
      columnSpec: columnSpec as any,
      filters: columnTableFilters,
      itemComponent: ColumnRowCard,
      scrollBody: ColumnScrollBody,
      toolbar: h(SourceFacetsButton),
      // The panel is a bounded scroller in both shells, so the floating toolbar
      // pins to the top of the list exactly as it does on the ingestion page.
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      // Modal selection, the same configuration the map-ingestion list uses: the
      // library owns the Select control and the mode, we own the selected set.
      enableSelection: SelectionInteractionStyle.MODAL,
      contentFooter: h(HybridContentFooter),
    },
    [
      h(VisibleRowsBridge, { key: "visible" }),
      h(FilterStateBridge, { key: "filter-state" }),
      h(SelectionPushBridge, { key: "selection" }),
      h(LexSuggestBridge, { key: "lex-suggest" }),
      h(SelectionModeBridge, { key: "selection-mode" }),
    ]
  );
}

/** The complete filtered set, mirrored out to the page.
 *
 * Deliberately *not* the panel's `data`: that is now a sparse, paged array, so
 * following it would leave the map drawing only the pages scrolled so far. We
 * instead apply the active filters' own predicates to the full row set — the
 * same `TableFilter.predicate`s the provider uses, so there's one definition of
 * each filter and no drift, just no pagination. */
function VisibleRowsBridge() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const allRows = useAtomValue(allRowsAtom);
  const setVisibleRows = useSetAtom(visibleRowsAtom);

  useEffect(() => {
    const entries = [...(activeFilters?.values() ?? [])];
    let rows = allRows;
    if (entries.length > 0) {
      rows = rows.filter((row) =>
        entries.every(({ filter, state }) => {
          if (filter?.predicate == null) return true;
          return filter.predicate(row, state);
        })
      );
    }
    setVisibleRows(rows);
  }, [allRows, activeFilters, setVisibleRows]);

  return null;
}

/** Keeps the two externally-fed filters' state fresh while they're active.
 *
 * Activation belongs to the library — they're ordinary entries in its Filter
 * menu — so this only tops up the live values their predicates need (the
 * current selection; the map viewport) whenever those change and the filter is
 * on. Writing through `store.setFilter` is the same seam the ingestion list's
 * tag chips use. */
function FilterStateBridge() {
  const setFilterState = ctx.useSet(setFilterStateAtom);
  const activeFilters = useSelector((state) => state.activeFilters);
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const bounds = useAtomValue(mapBoundsAtom);

  const onlySelectedActive =
    activeFilters?.has(ONLY_SELECTED_FILTER_ID) ?? false;
  const inMapAreaActive = activeFilters?.has(IN_MAP_AREA_FILTER_ID) ?? false;

  useEffect(() => {
    if (!onlySelectedActive) return;
    setFilterState(ONLY_SELECTED_FILTER_ID, onlySelectedFilter, {
      ids: selectedIDs,
    });
  }, [onlySelectedActive, selectedIDs, setFilterState]);

  useEffect(() => {
    if (!inMapAreaActive) return;
    setFilterState(IN_MAP_AREA_FILTER_ID, inMapAreaFilter, { bounds });
  }, [inMapAreaActive, bounds, setFilterState]);

  return null;
}

const setFilterStateAtom = atom(
  null,
  (get, _set, id: string, filter: any, state: any) => {
    const store = get(storeAtom);
    if (store == null) return;
    if (filter == null) {
      store.removeFilter(id);
      return;
    }
    store.setFilter(id, filter, state);
  }
);

/** Pushes the page's selection down into the panel store, one way only, so the
 * selection-aware toolbar and any selection-scoped actions see it. Re-pushed
 * when the row set changes, because a filter change drops it. */
function SelectionPushBridge() {
  const setSelection = ctx.useSet(selectionAtom);
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const rows = useAtomValue(visibleRowsAtom);

  useEffect(() => {
    const indices = new Set<number>();
    for (const id of selectedIDs) {
      const index = rows.findIndex((row) => row.col_id === id);
      if (index >= 0) indices.add(index);
    }
    setSelection(rowIndicesToRegions(indices));
  }, [selectedIDs, rows, setSelection]);

  return null;
}

/** Feeds the lexicon-facet suggester from the library's search text, so typing
 * in the toolbar's search box still offers lithologies, strat names and the rest
 * as *server-side* facets — a capability the text filter can't cover, since
 * those narrow the request rather than the loaded rows. */
function LexSuggestBridge() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const setInputText = useSetAtom(inputTextAtom);

  const text = activeFilters?.get(SEARCH_FILTER_ID)?.state?.text ?? "";

  useEffect(() => {
    setInputText(text);
  }, [text, setInputText]);

  return null;
}

function LexSuggestions() {
  const suggestions = useAtomValue(suggestedFiltersAtom) ?? [];
  const addFilter = useSetAtom(addFilterAtom);

  if (suggestions.length === 0) return null;

  const onSelect = (data) => {
    const filterKey = filterKeyFromType(data.type);
    if (filterKey == null) return;
    addFilter({
      type: filterKey,
      identifier: data.lex_id,
      name: data.name,
      color: data.color,
    });
  };

  return h(
    "div.lex-suggestions",
    suggestions.map((data) =>
      h(
        "div.lith-tag",
        {
          key: data.type + data.lex_id,
          onClick: () => onSelect(data),
        },
        [
          h(LithologyTag, { data: { name: data.name, color: data.color } }),
          h("span.label", data.type),
        ]
      )
    )
  );
}

/** A row. `selected` comes from the page's selection, not the panel's — the
 * panel's is a derived artifact here, and reading it back would reintroduce the
 * index-based fragility the page-level selection exists to avoid. */
function ColumnRowCard({ data }) {
  const linkPrefix = useAtomValue(linkPrefixAtom);
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const selectColumn = useSetAtom(selectColumnAtom);
  const selectionMode = useAtomValue(selectionModeAtom);

  const { col_id, col_name, t_units, t_sections, status_code } = data;
  const selected = selectedIDs.includes(col_id);

  let unitsTag = null;
  if (t_units > 0) {
    unitsTag = h(Tag, { minimal: true, size: "small" }, `${t_units} units`);
  }

  let packagesTag = null;
  if (t_sections > 0) {
    packagesTag = h(
      Tag,
      { minimal: true, size: "small", color: "goldenrod" },
      `${t_sections} pkg`
    );
  }

  let statusTag = null;
  if (status_code === "in process") {
    statusTag = h(
      Tag,
      { minimal: true, size: "small", color: "lightgreen" },
      "in process"
    );
  }

  const onClick = (evt) => {
    const additive = evt.metaKey || evt.ctrlKey;
    const range = evt.shiftKey;

    // Out of selection mode a plain click opens the column, matching what a
    // click on its footprint does. Modifier-clicks still select, so a selection
    // can be started without reaching for the mode toggle first.
    if (!selectionMode && !additive && !range) {
      navigate(`${linkPrefix}columns/${col_id}`);
      return;
    }
    // Inside the mode a plain click toggles — same as a footprint click on the
    // map, and the whole point of entering the mode. A plain click *replacing*
    // the selection would make the mode useless for building one up.
    selectColumn(col_id, { additive: additive || selectionMode, range });
  };

  return h("div.column-row", { className: classNames({ selected }), onClick }, [
    h(
      "a.col-name",
      { href: `${linkPrefix}columns/${col_id}`, onClick: stopPropagation },
      col_name
    ),
    statusTag,
    packagesTag,
    unitsTag,
    h("span.col-identifier", h(Identifier, { id: col_id })),
  ]);
}

function stopPropagation(evt) {
  evt.stopPropagation();
}

/** Mirrors the library's modal-selection state out to the page.
 *
 * `SelectionInteractionStyle.MODAL` puts the Select control in the panel's own
 * actions toolbar — consistent with the ingestion list, and one less bespoke
 * button. But the *map* also needs to know the mode, and it renders outside the
 * panel's provider, so the flag is mirrored to a page atom. One way: the
 * library owns the mode, we own the selected set. */
function SelectionModeBridge() {
  const enabled = ctx.useValue(enableSelectionAtom);
  const setSelectionMode = useSetAtom(selectionModeAtom);

  useEffect(() => {
    setSelectionMode(enabled ?? false);
  }, [enabled, setSelectionMode]);

  return null;
}

/* ------------------------------------------------------------ source facets */

/** The facets that change the *request* rather than filtering loaded rows —
 * empty / in-process columns, and the lexicon facets. They can't be
 * `TableFilter`s (those are row predicates), and the panel's toolbar is a fixed
 * 40px bar, so they collapse behind one button instead of a row of switches.
 * Everything row-local lives in the library's own Filter menu. */
function SourceFacetsButton() {
  const filters = useAtomValue(columnFilterAtom);
  const showEmpty = useAtomValue(showEmptyAtom);
  const showInProcess = useAtomValue(showInProcessAtom);

  const activeCount =
    filters.length + (showEmpty ? 0 : 1) + (showInProcess ? 1 : 0);

  let label = "Source";
  if (activeCount > 0) {
    label = `Source (${activeCount})`;
  }

  return h(Popover, {
    minimal: true,
    placement: "bottom-start",
    content: h(SourceFacetsPanel),
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(
        Button,
        {
          ...targetProps,
          minimal: true,
          small: true,
          active: isOpen,
          icon: "database",
          rightIcon: "caret-down",
        },
        label
      ),
  });
}

function SourceFacetsPanel() {
  const [showEmpty, setShowEmpty] = useAtom(showEmptyAtom);
  const [showInProcess, setShowInProcess] = useAtom(showInProcessAtom);

  return h("div.source-facets", [
    h(Switch, {
      checked: showEmpty,
      label: "Show empty columns",
      onChange: () => setShowEmpty(!showEmpty),
    }),
    h(Switch, {
      checked: showInProcess,
      label: "Show in-process columns",
      onChange: () => setShowInProcess(!showInProcess),
    }),
    h(LexSuggestions),
    h(LexFilters),
  ]);
}

function LexFilters() {
  const filters = useAtomValue(columnFilterAtom);
  if (filters.length == 0) return null;

  return h("div.lex-filters", [
    h("p.filter-label", "Filtering by"),
    ...filters.map((filter) =>
      h(ColumnFilterItem, {
        data: { ...filter, lex_id: filter.identifier },
        key: filter.type + filter.identifier,
      })
    ),
  ]);
}

function ColumnFilterItem({ data }: { data: ColumnFilterDef & any }) {
  const { type, identifier } = data;
  const route = routeForFilterKey(type);
  const clearAllFilters = useSetAtom(clearAllFiltersAtom);

  return h("div.lex-filter-item", [
    h(LithologyTag, { href: `/lex/${route}/${identifier}`, data }),
    h(Icon, {
      className: "close-btn",
      icon: "cross",
      onClick: clearAllFilters,
    }),
  ]);
}

/* ------------------------------------------------------------- assistant */

function ColumnAssistant() {
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const rows = useAtomValue(allRowsAtom);
  const visible = useAtomValue(visibleRowsAtom);
  const linkPrefix = useAtomValue(linkPrefixAtom);

  const selected = useMemo(
    () => rows.filter((row) => selectedIDs.includes(row.col_id)),
    [rows, selectedIDs]
  );

  if (selected.length === 0) {
    return h("div.assistant", [
      h("h2", "Columns"),
      h(
        "p.assistant-empty",
        `${visible.length} of ${rows.length} columns shown. Select one in the list or on the map to see its details.`
      ),
      h(AssistantLinks),
    ]);
  }

  if (selected.length > 1) {
    // Deliberately not a list of the selection — that's what "only selected"
    // does, and one list of columns per page is the rule.
    return h("div.assistant", [
      h("h2", `${selected.length} columns selected`),
      h(
        "p.assistant-empty",
        "Turn on “Only selected” to narrow the list to these columns."
      ),
      h(AssistantLinks),
    ]);
  }

  const row = selected[0];
  return h("div.assistant", [
    h("h2", row.col_name),
    h(DataField, { row: true, label: "Column", value: row.col_id }),
    h(DataField, { row: true, label: "Group", value: row.col_group }),
    h(DataField, { row: true, label: "Units", value: row.t_units }),
    h(DataField, {
      row: true,
      label: "Area",
      value: row.col_area,
      unit: "km²",
    }),
    h(
      "p.assistant-link",
      h(
        Link,
        { href: `${linkPrefix}columns/${row.col_id}` },
        "Open column page"
      )
    ),
    h(AssistantLinks),
  ]);
}

function AssistantLinks() {
  return h(ButtonGroup, { vertical: true, className: "assistant-links" }, [
    h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
    h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
  ]);
}
