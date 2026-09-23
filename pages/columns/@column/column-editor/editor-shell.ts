/** The editor itself: a column, its editing sheet, and an inspector — or, in
 * table mode, the same interface read-only.
 *
 * Deliberately full-screen and map-free. An editor is a working surface, so
 * the frame runs in `content-full` and the three panes divide the viewport
 * between them rather than scrolling as a document; picking a *different*
 * column is the column list's job, not something to do from inside a session.
 *
 * One store of units is shown three ways — as attributes, as the
 * ingestion-format `units` table, or as the age model's surfaces — and the
 * column redraws live. In edit mode (`/columns/:id/edit`) the sheets and the
 * details pane take edits; edits are local (there is no write API yet): reset
 * returns to the column as loaded, export writes a `units` sheet in the
 * column-ingestion format. In table mode (`/columns/:id/table`) nothing is
 * writable and export is the way out — the structure of a column and the age
 * model behind it, for anyone.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useCallback, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  AnchorButton,
  Button,
  ButtonGroup,
  SegmentedControl,
  Tag,
} from "@blueprintjs/core";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { IntervalTag, TagSize } from "@macrostrat/data-components";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import { AlphaTag } from "~/components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import type { ColumnEditorData } from "./data";
import { COLUMNS_INDEX, columnHref, editorHref, tableHref } from "./data";
import { EditorColumn } from "./column-view";
import { DisplaySettingsButton } from "./settings-panel";
import { EditorInspector } from "./inspector";
import { SurfacesSheet, UnifiedSheet, UnitsSheet } from "./sheets";
import {
  blockingIssuesAtom,
  ColumnFocusProvider,
  useColumnFocus,
  columnVisibleAtom,
  editModeAtom,
  type EditingMode,
  editedUnitsAtom,
  editingModeAtom,
  inspectorOpenAtom,
  isDirtyAtom,
  resetEditsAtom,
  sheetVisibleAtom,
  snapshotAtom,
} from "./state";
import { downloadText, unitsToCSV } from "./export";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** One mode only. The editor fills the window and owns its own scrolling; a
 * map or a sidebar here would take room the working surface needs. */
const capabilities: Partial<LayoutCapabilities> = {
  modes: ["content-full"],
  defaultMode: "content-full",
  hasAssistant: false,
  itemName: "Editor",
  contentScroll: "panel",
};

export interface ColumnEditorPageProps extends ColumnEditorData {
  /** Whether this is the editor or the read-only table view. */
  edit: boolean;
}

export function ColumnEditorPage(props: ColumnEditorPageProps) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnEditorFrame, props))
  );
}

function ColumnEditorFrame(props: ColumnEditorPageProps) {
  const { col_id, columnInfo, units, boundaries, isDraft, edit } = props;

  // The frame isolates every atom below it, so the column is seeded through
  // `initialAtoms`; keying on the column remounts the frame (and re-seeds)
  // when the route moves to another one.
  // Only the snapshot and the mode are seeded: the snapshot *is* the input
  // data, the mode is the route's, and the transaction starts empty.
  const initialAtoms = useMemo(() => {
    const snapshot = { col_id, columnInfo, units, boundaries, isDraft };
    return [
      [snapshotAtom, snapshot],
      [editModeAtom, edit],
    ] as [any, any][];
  }, [col_id, columnInfo, units, boundaries, isDraft, edit]);

  return h(HybridPage, {
    key: `${col_id ?? "draft"}:${edit}`,
    className: classNames("column-editor-page", {
      "edit-mode": edit,
      "table-mode": !edit,
    }),
    capabilities,
    initialAtoms,
    // Inside the frame's jotai scope, so the focused window is one thing the
    // column, the sheets and the toolbar all read.
    wrap: (node) => h(ColumnFocusProvider, node),
    // Context on the title row, the working controls beneath it: what column
    // this is and how to leave it belong with the page's identity, while the
    // things that act on the transaction belong above the sheet they act on.
    titleAdornment: h(EditorContext),
    actions: h(EditorNavigation),
    filterBar: h(EditorToolbar),
    content: h(EditorContent),
  });
}

/* ---------------------------------------------------------------- header */

/** What this page is: the editor's own warning and the column's unsaved
 * state, or the table view's tag. Sits with the title, not with the
 * controls. */
function EditorContext() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const edit = useAtomValue(editModeAtom);

  if (!edit) {
    return h("span.editor-context", [
      h(
        Tag,
        { minimal: true, icon: "th", className: "view-mode-tag" },
        "Table view"
      ),
    ]);
  }

  let draftTag = null;
  if (snapshot?.isDraft) {
    draftTag = h(
      Tag,
      { intent: "warning", minimal: true, className: "draft-tag" },
      "Unsaved column"
    );
  }

  return h("span.editor-context", [
    h(AlphaTag, {
      content:
        "An experimental editor. Edits stay in the page: reset discards them, export writes a units sheet in the column-ingestion format.",
    }),
    draftTag,
    h.if(isDirty)("span.dirty-indicator", "Unsaved edits"),
  ]);
}

/** Leaving, and moving between the two faces of this interface — navigation
 * actions, so they keep the title row. */
function EditorNavigation() {
  const snapshot = useAtomValue(snapshotAtom);
  const edit = useAtomValue(editModeAtom);
  const col_id = snapshot?.col_id ?? null;

  // A draft has no column page to return to; leaving it is leaving for the
  // list, and there is no read-only face of a column that isn't written.
  let backHref = COLUMNS_INDEX;
  let sibling = null;
  if (col_id != null) {
    backHref = columnHref(col_id);
    if (edit) {
      sibling = h(AnchorButton, {
        icon: "th",
        text: "Table view",
        minimal: true,
        small: true,
        href: tableHref(col_id),
      });
    } else {
      sibling = h(AnchorButton, {
        icon: "edit",
        text: "Edit",
        minimal: true,
        small: true,
        href: editorHref(col_id),
      });
    }
  }

  return h(ButtonGroup, { minimal: true }, [
    sibling,
    h(AnchorButton, {
      icon: "cross",
      text: "Close",
      minimal: true,
      small: true,
      href: backHref,
    }),
  ]);
}

function exportTitle(errorCount: number): string | undefined {
  if (errorCount === 0) return undefined;
  return `${errorCount} cell${errorCount === 1 ? "" : "s"} need fixing first`;
}

/** Reset and export: they act on the transaction, so they sit on the toolbar
 * row with the mode control rather than beside the title. Export stands in
 * both modes — the table view's way to take a column away; reset only where
 * there is a transaction to reset. */
function TransactionActions() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const edit = useAtomValue(editModeAtom);
  const resetEdits = useSetAtom(resetEditsAtom);
  const units = useAtomValue(editedUnitsAtom);
  const blockingIssues = useAtomValue(blockingIssuesAtom);

  const onExport = useCallback(() => {
    const csv = unitsToCSV(units);
    downloadText(`column-${snapshot?.col_id ?? "draft"}-units.csv`, csv);
  }, [units, snapshot?.col_id]);

  return h(ButtonGroup, { minimal: true }, [
    h.if(edit)(Button, {
      icon: "reset",
      text: "Reset",
      small: true,
      disabled: !isDirty,
      onClick: resetEdits,
    }),
    h(Button, {
      icon: "download",
      text: "Export CSV",
      small: true,
      // An ingestion sheet with a unit overlapping its neighbour isn't worth
      // writing out; the sheet says which cells are at fault.
      disabled: blockingIssues.length > 0,
      title: exportTitle(blockingIssues.length),
      onClick: onExport,
    }),
  ]);
}

/** What the column is focused on, and the way back out of it. Nothing at all
 * while the whole column is showing, which is most of the time.
 *
 * Named by the intervals that were clicked, as the timescale draws them,
 * rather than by the ages they work out to — a period has a name and that is
 * what you picked. A window focused from a row action has no interval behind
 * it, so that one falls back to its age range. */
function FocusIndicator() {
  const zoom = useColumnFocus();
  if (zoom == null || !zoom.enabled || zoom.isFullExtent) return null;

  const intervals = zoom.selectedIntervals ?? [];
  let label;
  if (intervals.length > 0) {
    label = intervals.map((interval) =>
      h(IntervalTag, {
        key: interval.oid,
        size: TagSize.Small,
        interval: {
          id: interval.oid,
          name: interval.nam,
          b_age: interval.eag,
          t_age: interval.lag,
          color: interval.col,
          rank: interval.lvl,
        },
      })
    );
  } else {
    const { t_age, b_age } = zoom.window ?? {};
    label = h("span.focus-ages", `${formatAge(b_age)}–${formatAge(t_age)} Ma`);
  }

  return h("span.focus-indicator", [
    label,
    h(Button, {
      className: "clear-button",
      icon: "cross",
      minimal: true,
      small: true,
      title: "Show the whole column again",
      onClick: () => zoom.reset(),
    }),
  ]);
}

function formatAge(age: number | undefined): string {
  if (age == null) return "—";
  return age.toFixed(age < 10 ? 2 : 0);
}

/** Everything that acts on the column: which table is showing, how it is
 * drawn, which panes frame it, and what to do with the transaction. In the
 * header's second row, directly above the sheet it acts on. */
function EditorToolbar() {
  const [mode, setMode] = useAtom(editingModeAtom);
  const [columnVisible, setColumnVisible] = useAtom(columnVisibleAtom);
  const [sheetVisible, setSheetVisible] = useAtom(sheetVisibleAtom);
  const [inspectorOpen, setInspectorOpen] = useAtom(inspectorOpenAtom);

  return h("div.editor-toolbar", [
    h(SegmentedControl, {
      small: true,
      options: [
        { label: "Units", value: "units" },
        // The ingestion sheet's own view, between the two: units with their
        // boundaries, surfaces implicit
        { label: "Unified", value: "unified" },
        { label: "Surfaces", value: "surfaces" },
      ],
      value: mode,
      onValueChange: (value: EditingMode) => setMode(value),
    }),
    h(FocusIndicator),
    h("div.spacer"),
    h(TransactionActions),
    h(DisplaySettingsButton),
    // Any pane gives way to the others: a wide table is the reason to hide the
    // column or the details, and the details pane's row editor is the reason
    // to hide the table — one record at a time, with the column beside it.
    h(ButtonGroup, { minimal: true }, [
      h(Button, {
        icon: "vertical-bar-chart-asc",
        small: true,
        active: columnVisible,
        text: "Column",
        onClick: () => setColumnVisible(!columnVisible),
      }),
      h(Button, {
        icon: "th",
        small: true,
        active: sheetVisible,
        text: "Table",
        onClick: () => setSheetVisible(!sheetVisible),
      }),
      h(Button, {
        icon: "panel-stats",
        small: true,
        active: inspectorOpen,
        text: "Details",
        onClick: () => setInspectorOpen(!inspectorOpen),
      }),
    ]),
  ]);
}

/* --------------------------------------------------------------- content */

/** Column, sheet and inspector, side by side, filling the viewport. The
 * inspector is part of the working surface here rather than the frame's
 * assistant slot, which `content-full` doesn't render. With the sheet hidden
 * the inspector takes its room, so the row editor has space to be a form. */
function EditorContent() {
  const mode = useAtomValue(editingModeAtom);
  const columnVisible = useAtomValue(columnVisibleAtom);
  const sheetVisible = useAtomValue(sheetVisibleAtom);
  const inspectorOpen = useAtomValue(inspectorOpenAtom);

  let sheet = h(UnitsSheet);
  if (mode === "surfaces") {
    sheet = h(SurfacesSheet);
  } else if (mode === "unified") {
    sheet = h(UnifiedSheet);
  }

  let column = null;
  if (columnVisible) {
    column = h(
      "div.editor-column-pane",
      { className: classNames(`mode-${mode}`) },
      h(ErrorBoundary, h(EditorColumn))
    );
  }

  let sheetPane = null;
  if (sheetVisible) {
    sheetPane = h("div.editor-sheet-pane", h(ErrorBoundary, sheet));
  }

  // With no table on screen the details pane is the working surface, and is
  // always shown — otherwise the page would be a column and nothing else.
  let inspector = null;
  if (inspectorOpen || !sheetVisible) {
    inspector = h(
      "div.editor-inspector-pane",
      { className: classNames({ wide: !sheetVisible }) },
      h(ErrorBoundary, h(EditorInspector))
    );
  }

  return h("div.editor-content", { className: classNames(`mode-${mode}`) }, [
    column,
    sheetPane,
    inspector,
  ]);
}
