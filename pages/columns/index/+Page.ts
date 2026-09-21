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
  Spinner,
  Switch,
  Tag,
} from "@blueprintjs/core";
import {
  DataPanel,
  DataPanelToolbarStyle,
  type TableFilter,
  SelectionInteractionStyle,
  createLocalProvider,
  ctx,
  enableSelectionAtom,
  rowIndicesToRegions,
  selectionAtom,
  storeAtom,
  useSelector,
  type ActiveFilterEntry,
  type InitialDataChunk,
} from "@macrostrat/data-sheet";
import { DataField, Identifier } from "@macrostrat/data-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { useData } from "vike-react/useData";
import { navigate } from "vike/client/router";
import classNames from "classnames";

import { DevLinkButton, Link } from "~/components";
import { LinkCard } from "~/components/cards";
import { LithologyTag } from "~/components/lex/tag";
import {
  autoLoadPagesForItems,
  createWindowedScrollBody,
} from "~/components/data-view";
import { HybridContentFooter, HybridPage } from "~/layouts/hybrid";
import {
  projectIDParam,
  ProjectFilterControl,
  ProjectFilterProvider,
  ProjectFilterTag,
  resolveProjectIDs,
} from "~/components/project-filter";
import {
  InProcessFilterProvider,
  InProcessFilterTag,
  InProcessSwitch,
} from "~/components/in-process-filter";
import { onDemand } from "~/_utils";
import { useColumnMapBounds } from "~/components/column-map/target";
import {
  useCarriedScopeAtMount,
  usePublishColumnScope,
} from "~/components/column-scope";

import {
  columnTableFilters,
  columnURLBindings,
  inMapAreaFilter,
  IN_MAP_AREA_FILTER_ID,
  SEARCH_FILTER_ID,
  onlySelectedFilter,
  ONLY_SELECTED_FILTER_ID,
} from "./filters";
import { initialViewStateFromURL } from "~/components";
import { columnPageLinks, rowsAfterColumn } from "./page-links";
import { atomWithSearchParam } from "~/_utils/url-atoms";
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
  useColumnHref,
  projectIDAtom,
  projectFilterAtom,
  projectSlugsAtom,
  projectsAtom,
  routeForFilterKey,
  selectColumnAtom,
  selectedColumnsAtom,
  selectionModeAtom,
  showEmptyAtom,
  showInProcessAtom,
  showInProcessValueAtom,
  visibleRowsAtom,
  type ColumnFilterDef,
  type ColumnRow,
  startAfterAtom,
  pageLocationAtom,
  startAfterParamAtom,
} from "./state";

import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const ColumnListMap = onDemand(() =>
  import("./map.client").then((mod) => mod.ColumnListMap)
);

/** Must match `$row-height` / `$group-height` / `$group-gap` in
 * `main.module.sass` — the windowed body lays bands out by arithmetic, so it
 * can't measure them.
 *
 * `ROW_HEIGHT` is the height of a *band* (one line of the grid), not of the
 * list: three cards share a band. Each card is one line — name, any status, and
 * the id — so the band is only a little taller than the row it replaced while
 * holding three times as much. */
const ROW_HEIGHT = 40;
/** The width a column card wants. The grid fits as many as the body has room
 * for — three at the content measure, one in the ~350px panel beside the map. */
const COLUMN_CARD_WIDTH = 280;
/** What to assume before the body is measured (server + first client render). */
const COLUMN_INITIAL_COLUMNS = 3;
/** Space closing each column group, so the next group's sticky header doesn't
 * butt up against the last card of the previous one. */
const GROUP_GAP = 12;
const GROUP_HEIGHT = 30;
const SECTION_HEIGHT = 34;

/** Rows per fetched page. How far it auto-scrolls before the footer's "Load
 * more" takes over is the shared row budget (`data-view/auto-load`) — deep
 * results are reached by narrowing the filters, not by scrolling forever. */
const PAGE_SIZE = 100;
const AUTO_LOAD_PAGES = autoLoadPagesForItems(PAGE_SIZE);

/** A project's overview page. */
function projectHref(projectID: number | null | undefined): string | null {
  if (projectID == null || projectID <= 0) return null;
  return `/projects/${projectID}`;
}

/** A column group's page, which is nested under its project. Both ids are on
 * the row, so no lookup is needed. */
function groupHref(
  projectID: number | null | undefined,
  groupID: number | null | undefined
): string | null {
  if (projectID == null || projectID <= 0) return null;
  if (groupID == null || groupID <= 0) return null;
  return `/projects/${projectID}/groups/${groupID}`;
}

const ColumnScrollBody = createWindowedScrollBody<ColumnRow>({
  // One seeded page in the server HTML, for crawlers (see page-links.ts)
  initialRows: PAGE_SIZE,
  rowHeight: ROW_HEIGHT,
  columnWidth: COLUMN_CARD_WIDTH,
  initialColumns: COLUMN_INITIAL_COLUMNS,
  groupGap: GROUP_GAP,
  // Projects are the outer sections (a handful, some very large); column groups
  // the inner ones (164 of them, median ~15 rows).
  sectionHeight: SECTION_HEIGHT,
  sectionOf: (row) => {
    if (row == null) return null;
    return {
      key: row.project_id,
      label: h(HeaderLabel, {
        name: row.project_name,
        id: row.project_id,
        href: projectHref(row.project_id),
      }),
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
        href: groupHref(row.project_id, row.col_group_id),
      }),
    };
  },
});

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
 * of the list, so project, group and column read consistently.
 *
 * The name is a link when the level has a page of its own: a project, and a
 * column group within it. Both were plain text, which left the two levels of
 * grouping the list is built around as the only things in it you couldn't
 * follow. */
function HeaderLabel({ name, id, href = null }) {
  let identifier = null;
  if (id != null && id > 0) {
    identifier = h("span.header-identifier", h(Identifier, { id }));
  }

  let nameEl = h("span.header-name", name);
  if (href != null) {
    nameEl = h(Link, { className: "header-name header-link", href }, name);
  }

  return h([nameEl, identifier]);
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
  const { allColumnGroups, projects } = data;
  const scope = useSeededScope(data);

  return h(
    ProjectFilterProvider,
    { atom: projectFilterAtom, projects },
    h(
      InProcessFilterProvider,
      { atom: showInProcessAtom },
      h(HybridPage, {
        capabilities: { defaultMode: "content-primary" },
        initialAtoms: [
          [projectIDAtom, scope.projectID],
          [projectSlugsAtom, scope.projectSlugs],
          [showInProcessValueAtom, scope.inProcess],
          [
            initialDataAtom,
            { params: data.requestParams, groups: allColumnGroups },
          ],
          [startAfterAtom, data.startAfter ?? null],
          [pageLocationAtom, data.pageLocation ?? null],
          [linkPrefixAtom, linkPrefix],
          [projectsAtom, projects ?? []],
        ],
        // Inside the frame's jotai scope, so it sees the live filters.
        wrap: (node) => h(ColumnScopeSync, { adopted: scope.adopted }, node),
        content: h(ColumnList),
        map: h(ColumnListMapSlot),
        assistant: h(ColumnAssistant),
      })
    )
  );
}

/** What the list starts filtered by.
 *
 * Normally exactly what `+data.ts` fetched with — seeding anything else means
 * the client immediately refetches with different parameters. But when the URL
 * says nothing about a filter, the scope carried from the column page you came
 * from applies instead (`~/components/column-scope`), and the refetch is the
 * point: the server had no way to know. Resolved once, at first render, in
 * keeping with the read-the-URL-once rule. */
function useSeededScope(data) {
  const carried = useCarriedScopeAtMount();
  return useMemo(() => {
    let projectSlugs = data.projectSlugs ?? null;
    let projectID = data.project_id ?? null;
    let inProcess = data.showInProcess ?? false;

    // What was taken from the carried scope rather than from the URL — the
    // address bar has to be caught up for exactly those.
    const adopted = { project: false, inProcess: false };

    if (carried != null && !data.urlScope?.project) {
      projectSlugs = carried.projectSlugs;
      projectID = projectIDParam(
        resolveProjectIDs(data.projects ?? [], carried.projectSlugs)
      );
      adopted.project = true;
    }
    if (carried != null && !data.urlScope?.inProcess) {
      inProcess = carried.inProcess;
      adopted.inProcess = true;
    }
    return { projectSlugs, projectID, inProcess, adopted };
    // Resolved once: later navigations remount this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Remembers the list's scope for the next column page, and puts an adopted
 * scope into the URL.
 *
 * Seeding sets the filter atoms directly, which deliberately skips the writers
 * that mirror them to `?project_id=` / `?status_code=`. That is right for a
 * scope the URL already carries, but a scope *adopted* from the previous page
 * would then be invisible in the address bar — the list would be filtered by
 * something the link doesn't say. So an adopted scope is pushed back through
 * the real setters once, which is a no-op for the state and writes the URL. */
function ColumnScopeSync({ adopted, children }) {
  const projectSlugs = useAtomValue(projectSlugsAtom);
  const inProcess = useAtomValue(showInProcessValueAtom);
  const setProjectFilter = useSetAtom(projectFilterAtom);
  const setShowInProcess = useSetAtom(showInProcessAtom);

  useEffect(() => {
    if (adopted.project && projectSlugs != null && projectSlugs.length > 0) {
      setProjectFilter(projectSlugs);
    }
    if (adopted.inProcess && inProcess) {
      setShowInProcess(true);
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePublishColumnScope(projectSlugs, inProcess);
  return children;
}

/** The active filters, as tags in the panel's filter bar beside the controls
 * that set them.
 *
 * They used to sit in the frame's header row, which collapses when it has no
 * tags (`.header-filters:empty`) — so selecting or clearing a project changed
 * the header's height and pushed the whole list down. The filter bar is a
 * single flex row with its own `min-height`, so a tag appearing or going away
 * costs no layout. Each tag's × drops just that filter; the project picker
 * itself lives in the side panel, with the link to the projects pages. */
function ColumnFilterTags() {
  return h("div.filter-tags", [h(ProjectFilterTag), h(InProcessFilterTag)]);
}

/** The map follows the project filter as it changes, not just the initial id. */
function ColumnListMapSlot() {
  const projectID = useAtomValue(projectIDAtom);
  return h(ColumnListMap, { projectID });
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

  // The search text is read from `?q=` once, when the page loads, and applied
  // at store creation so the first render is the linked view. From then on the
  // URL only follows the state (`SearchURLWriter`); it is never read back.
  const initialView = useMemo(
    () => initialViewStateFromURL(columnURLBindings, { sortParam: null }),
    []
  );

  // The first page, handed to the panel at store creation. The rows are in
  // memory on the server too, so the server render carries real rows rather
  // than the empty state the panel shows until its first (asynchronous) page
  // resolves — and the client doesn't fetch a page it was given. Filtered with
  // the same predicates the provider would apply, so a linked search (`?q=`)
  // seeds its own first page. The list has no user sorts, so the order is the
  // provider's.
  //
  // Crawlable paging: a `?after=<col_id>` page seeds the rows after that column,
  // and the panel is told the cursor (`startAfter`) so its later chunks count
  // from the same place. `pageLinks` gives the panel the hidden next-page link
  // and the "Return to top" link, both on this page's own URL.
  const startAfter = useAtomValue(startAfterAtom);
  const pageLocation = useAtomValue(pageLocationAtom);
  const initialData = useMemo(
    () =>
      firstPage(
        rowsAfterColumn(
          applyRowFilters(rows, initialView.initialFilters),
          startAfter
        )
      ),
    []
  );
  const pageLinks = useMemo(() => columnPageLinks(pageLocation), [pageLocation]);

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
      initialFilters: initialView.initialFilters,
      initialData,
      startAfter,
      pageLinks,
      // Typing shouldn't refilter on every keystroke
      filterDebounce: 200,
      pageSize: PAGE_SIZE,
      autoLoadPages: AUTO_LOAD_PAGES,
      columnSpec: columnSpec as any,
      // The library's Filter menu carries the row-local filters and, as an
      // inline section, the request-changing "Source" facets.
      filters: [...columnTableFilters, sourceFilter],
      itemComponent: ColumnRowCard,
      scrollBody: ColumnScrollBody,
      // The project dropdown sits in the panel's own toolbar, beside the
      // built-in search and Filter / Sort controls, as the ingestion list does.
      toolbar: h(ColumnFilterTags),
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
      h(SearchURLWriter, { key: "url" }),
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
    setVisibleRows(applyRowFilters(allRows, entries));
  }, [allRows, activeFilters, setVisibleRows]);

  return null;
}

/** The rows that pass every active filter's own predicate — the same
 * `TableFilter.predicate`s the provider applies, so there is one definition
 * of each filter. */
function applyRowFilters(
  rows: ColumnRow[],
  entries: ActiveFilterEntry[]
): ColumnRow[] {
  if (entries.length === 0) return rows;
  return rows.filter((row) =>
    entries.every(({ filter, state }) => {
      if (filter?.predicate == null) return true;
      return filter.predicate(row, state);
    })
  );
}

/** The panel's first window over a known row set. */
function firstPage(rows: ColumnRow[]): InitialDataChunk<ColumnRow> {
  return { rows: rows.slice(0, PAGE_SIZE), totalCount: rows.length };
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
  const bounds = useColumnMapBounds();

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

const searchParamAtom = atomWithSearchParam("q");

/** Writes the search text to `?q=`, one way and after a pause, so a burst of
 * keystrokes is one location change and the URL never feeds back into state. */
function SearchURLWriter() {
  const activeFilters = useSelector((state) => state.activeFilters);
  const setParam = useSetAtom(searchParamAtom);
  const setStartAfterParam = useSetAtom(startAfterParamAtom);
  const text: string = (activeFilters?.get(SEARCH_FILTER_ID)?.state?.text ?? "").trim();

  // The first run only restates the text the page loaded with; a later one is
  // a changed search, which also ends a `?after=` page (see `page-links.ts`).
  const isFirstRun = useRef(true);
  useEffect(() => {
    const changed = !isFirstRun.current;
    isFirstRun.current = false;
    const handle = setTimeout(() => {
      setParam(text === "" ? null : text);
      if (changed) setStartAfterParam(null);
    }, 300);
    return () => clearTimeout(handle);
  }, [text, setParam, setStartAfterParam]);

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

/** One column, as a card.
 *
 * The card *is* the link — `LinkCard` with an `onClick` — rather than a div
 * with an anchor inside it and a click handler on the row. That arrangement had
 * to intercept the anchor's click to keep it from reaching the row handler, and
 * because vike's client router listens on the document, the event it needed
 * never arrived: every click on a column name was a full page load. With the
 * anchor on the outside there is nothing to intercept, and middle-click, copy
 * link and the client router all behave normally.
 *
 * `selected` comes from the page's selection, not the panel's — the panel's is a
 * derived artifact here, and reading it back would reintroduce the index-based
 * fragility the page-level selection exists to avoid.
 */
function ColumnRowCard({ data }) {
  const columnHref = useColumnHref();
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const selectColumn = useSetAtom(selectColumnAtom);
  const selectionMode = useAtomValue(selectionModeAtom);

  const { col_id, col_name, t_units, t_sections, status_code } = data;
  const selected = selectedIDs.includes(col_id);

  // `t_units` / `t_sections` are only in the API's `response=long` payload,
  // which this list can't afford (4.7 MB and ~3 s for the 2,783 rows it holds
  // in memory, against 0.9 MB for the default). So these render when a caller
  // does have them and are simply absent here.
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
    // click on its footprint does — so the anchor is left to do its job.
    if (!selectionMode && !additive && !range) return;

    // Inside the mode a plain click toggles — same as a footprint click on the
    // map, and the whole point of entering the mode. Modifier-clicks select
    // outside it too, so a selection can be started without reaching for the
    // mode toggle first.
    evt.preventDefault();
    selectColumn(col_id, { additive: additive || selectionMode, range });
  };

  return h(
    LinkCard,
    {
      className: classNames("column-row", { selected }),
      href: columnHref(col_id),
      onClick,
      title: h("span.col-head", [
        h("span.col-name", { key: "name" }, col_name),
        h("span.col-tags", { key: "tags" }, [
          statusTag,
          packagesTag,
          unitsTag,
        ]),
        h("span.col-identifier", { key: "id" }, h(Identifier, { id: col_id })),
      ]),
      label: col_name,
    }
  );
}

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
 * the project, empty / in-process columns, and the lexicon facets. They live
 * in the library's Filter menu as one inline section ("Source"), beside the
 * row-local filters, so there is a single place to narrow the list. The
 * `TableFilter` is a carrier for the form: its predicate passes everything,
 * and the form drives the page's request atoms directly. */
const sourceFilter: TableFilter<ColumnRow, any> = {
  id: "source",
  name: "Source",
  icon: "database",
  presentation: "menu-inline",
  filterForm: SourceFacetsPanel,
  describeState: () => null,
  predicate: () => true,
};

function SourceFacetsPanel() {
  const [showEmpty, setShowEmpty] = useAtom(showEmptyAtom);

  return h("div.source-facets", [
    // The same picker as the side panel's, driving the same filter — people
    // look for "which projects" under Filter as readily as in a panel, and a
    // facet that changes the request belongs beside the others that do.
    h("div.source-projects", [
      h("p.filter-label", "Projects"),
      h(ProjectFilterControl, { className: "project-picker" }),
      h(ProjectFilterTag),
    ]),
    h(Switch, {
      checked: showEmpty,
      label: "Show empty columns",
      onChange: () => setShowEmpty(!showEmpty),
    }),
    h(InProcessSwitch),
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
  const columnHref = useColumnHref();

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
        { href: columnHref(row.col_id) },
        "Open column page"
      )
    ),
    h(AssistantLinks),
  ]);
}

/** The side panel's standing content, under whatever the selection shows.
 *
 * Projects are one subject, so the control that scopes the list to a project
 * and the link to the project pages sit together here rather than a filter
 * dropdown in the toolbar and an unrelated "Projects" button below. What the
 * picker selects still shows as tags in the filter bar, next to the list it
 * narrows. */
function AssistantLinks() {
  return h("div.assistant-links", [
    h("div.projects-section", [
      h("div.section-head", [
        h("h3", "Projects"),
        h(
          AnchorButton,
          {
            href: "/projects",
            minimal: true,
            small: true,
            rightIcon: "arrow-right",
            title: "All projects",
          },
          "Browse"
        ),
      ]),
      h(ProjectFilterControl, { className: "project-picker" }),
    ]),
    h(
      ButtonGroup,
      { vertical: true, className: "assistant-buttons" },
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart")
    ),
  ]);
}
