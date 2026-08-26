/** The column list page, on the hybrid content/map frame.
 *
 * The list is a `DataPanel` over the whole matching column set held in memory
 * — one request, everything addressable — with a windowed, group-headed scroll
 * body. That's what lets the list and the map stay exactly in sync: selection
 * is by `col_id` at the page level, and the panel's index-based selection is
 * reconciled against it whenever the row set changes.
 */

import { AnchorButton, ButtonGroup, Icon, Spinner, Switch, Tag } from "@blueprintjs/core";
import {
  DataPanel,
  DataPanelToolbarStyle,
  SelectionInteractionStyle,
  ctx,
  rowIndicesToRegions,
  selectionAtom,
  storeAtom,
  useSelector,
} from "@macrostrat/data-sheet";
import { DataField } from "@macrostrat/data-components";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { useData } from "vike-react/useData";
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
  ViewFilterSwitches,
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
  onlyInMapAreaAtom,
  onlySelectedAtom,
  projectIDAtom,
  routeForFilterKey,
  selectColumnAtom,
  selectedColumnsAtom,
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
const GROUP_HEIGHT = 34;

const ColumnScrollBody = createWindowedScrollBody<ColumnRow>({
  rowHeight: ROW_HEIGHT,
  groupHeight: GROUP_HEIGHT,
  groupOf: (row) => {
    if (row == null) return null;
    return { key: row.col_group_id ?? -1, label: row.col_group ?? "Ungrouped" };
  },
});

const columnSpec = [
  { key: "col_id", name: "ID", sortable: true },
  { key: "col_name", name: "Name", sortable: true, filterable: true },
  { key: "col_group", name: "Group", filterable: true },
  { key: "t_units", name: "Units", dataType: "integer", sortable: true },
];

export function Page({ linkPrefix = "/" }) {
  const { project, allColumnGroups } = useData();
  const projectID = project?.project_id ?? 14;

  return h(HybridPage, {
    capabilities: { defaultMode: "content-primary" },
    initialAtoms: [
      [projectIDAtom, projectID],
      [initialDataAtom, allColumnGroups],
      [linkPrefixAtom, linkPrefix],
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

  if (isLoading && rows.length === 0) {
    return h("div.list-loading", h(Spinner));
  }

  return h(
    DataPanel<ColumnRow>,
    {
      className: "column-panel",
      name: "Columns",
      itemLabel: "column",
      data: rows,
      identity: (row) => row?.col_id,
      columnSpec: columnSpec as any,
      filters: columnTableFilters,
      itemComponent: ColumnRowCard,
      scrollBody: ColumnScrollBody,
      toolbar: h(ColumnSourceControls),
      // The panel is a bounded scroller in both shells, so the floating toolbar
      // pins to the top of the list exactly as it does on the ingestion page.
      toolbarStyle: DataPanelToolbarStyle.FLOATING,
      statusBar: false,
      enableSelection: SelectionInteractionStyle.ALWAYS,
      contentFooter: h(HybridContentFooter),
    },
    [
      h(VisibleRowsBridge, { key: "visible" }),
      h(FilterStateBridge, { key: "filter-state" }),
      h(SelectionPushBridge, { key: "selection" }),
      h(LexSuggestBridge, { key: "lex-suggest" }),
    ]
  );
}

/** Mirrors the panel's post-filter rows out to the page. The library owns
 * filtering; the map and range-selection read the result from here, so neither
 * has to re-derive (or disagree about) the visible set. */
function VisibleRowsBridge() {
  const data = useSelector<ColumnRow, ColumnRow[]>((state) => state.data);
  const setVisibleRows = useSetAtom(visibleRowsAtom);

  useEffect(() => {
    setVisibleRows((data ?? []).filter(Boolean));
  }, [data, setVisibleRows]);

  return null;
}

/** Drives the two externally-fed filters. Their predicates need live values —
 * the current selection, the map viewport — so we write those into the filter's
 * own state through the store, the same seam the ingestion list's tag chips use.
 * Activation and deactivation go through `setFilter` / `removeFilter`, so the
 * library still renders them as standard removable filter tags. */
function FilterStateBridge() {
  const setFilterState = ctx.useSet(setFilterStateAtom);
  const onlySelected = useAtomValue(onlySelectedAtom);
  const onlyInMapArea = useAtomValue(onlyInMapAreaAtom);
  const selectedIDs = useAtomValue(selectedColumnsAtom);
  const bounds = useAtomValue(mapBoundsAtom);

  useEffect(() => {
    if (!onlySelected) {
      setFilterState(ONLY_SELECTED_FILTER_ID, null, null);
      return;
    }
    setFilterState(ONLY_SELECTED_FILTER_ID, onlySelectedFilter, {
      ids: selectedIDs,
    });
  }, [onlySelected, selectedIDs, setFilterState]);

  useEffect(() => {
    if (!onlyInMapArea) {
      setFilterState(IN_MAP_AREA_FILTER_ID, null, null);
      return;
    }
    setFilterState(IN_MAP_AREA_FILTER_ID, inMapAreaFilter, { bounds });
  }, [onlyInMapArea, bounds, setFilterState]);

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
    selectColumn(col_id, {
      additive: evt.metaKey || evt.ctrlKey,
      range: evt.shiftKey,
    });
  };

  return h(
    "div.column-row",
    { className: classNames({ selected }), onClick },
    [
      h("code.col-id", col_id),
      h(
        "a.col-name",
        { href: `${linkPrefix}columns/${col_id}`, onClick: stopPropagation },
        col_name
      ),
      statusTag,
      packagesTag,
      unitsTag,
    ]
  );
}

function stopPropagation(evt) {
  evt.stopPropagation();
}

/* ------------------------------------------------------------ source controls */

/** What the panel's own filter machinery can't express: the facets that change
 * the *request* (lex filters, empty/in-process), plus direct switches for the
 * two view filters. Everything row-local lives in `filters` instead. */
function ColumnSourceControls() {
  const [onlySelected, setOnlySelected] = useAtom(onlySelectedAtom);
  const [onlyInMapArea, setOnlyInMapArea] = useAtom(onlyInMapAreaAtom);
  const selectedIDs = useAtomValue(selectedColumnsAtom);

  return h("div.list-controls", [
    h(LexSuggestions),
    h(ViewFilterSwitches, {
      onlySelected,
      inMapArea: onlyInMapArea,
      setOnlySelected,
      setInMapArea: setOnlyInMapArea,
      selectedCount: selectedIDs.length,
    }),
    h(SourceSwitches),
    h(LexFilters),
  ]);
}

function SourceSwitches() {
  const [showEmpty, setShowEmpty] = useAtom(showEmptyAtom);
  const [showInProcess, setShowInProcess] = useAtom(showInProcessAtom);

  return h("div.source-switches", [
    h(Switch, {
      checked: showEmpty,
      label: "Show empty",
      onChange: () => setShowEmpty(!showEmpty),
    }),
    h(Switch, {
      checked: showInProcess,
      label: "Show in process",
      onChange: () => setShowInProcess(!showInProcess),
    }),
  ]);
}

function LexFilters() {
  const filters = useAtomValue(columnFilterAtom);
  if (filters.length == 0) return null;

  return h("div.lex-filters", [
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
    h(DataField, { row: true, label: "Area", value: row.col_area, unit: "km²" }),
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
  return h(
    ButtonGroup,
    { vertical: true, className: "assistant-links" },
    [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(
        DevLinkButton,
        { href: "/columns/correlation" },
        "Correlation chart"
      ),
    ]
  );
}
