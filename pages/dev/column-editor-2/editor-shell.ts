/** The editor itself: a column, its editing sheet, and an inspector.
 *
 * Deliberately full-screen and map-free. An editor is a working surface, so
 * the frame runs in `content-full` and the three panes divide the viewport
 * between them rather than scrolling as a document; picking a *different*
 * column is the index page's job (`../index`), not something to do from
 * inside an edit session.
 *
 * One store of units is edited two ways — as the ingestion-format `units`
 * table, or as the age model's surfaces — and the column redraws live. Edits
 * are local (there is no write API yet): reset returns to the column as
 * loaded, export writes a `units` sheet in the column-ingestion format.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useCallback, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button, ButtonGroup, SegmentedControl, Tag } from "@blueprintjs/core";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { IntervalTag, TagSize } from "@macrostrat/data-components";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import { AlphaTag } from "~/components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import type { ColumnEditorData } from "./data";
import { EDITOR_BASE } from "./data";
import { EditorColumn } from "./column-view";
import { DisplaySettingsButton } from "./settings-panel";
import { EditorInspector } from "./inspector";
import { SurfacesSheet, UnifiedSheet, UnitsSheet } from "./sheets";
import {
  blockingIssuesAtom,
  ColumnFocusProvider,
  useColumnFocus,
  columnVisibleAtom,
  type EditingMode,
  editedUnitsAtom,
  editingModeAtom,
  inspectorOpenAtom,
  isDirtyAtom,
  resetEditsAtom,
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

export function ColumnEditorPage(props: ColumnEditorData) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnEditorFrame, props))
  );
}

function ColumnEditorFrame(props: ColumnEditorData) {
  const { col_id, columnInfo, units, boundaries, isDraft } = props;

  // The frame isolates every atom below it, so the column is seeded through
  // `initialAtoms`; keying on the column remounts the frame (and re-seeds)
  // when the route moves to another one.
  // Only the snapshot is seeded: it *is* the input data, and the transaction
  // over it starts empty.
  const initialAtoms = useMemo(() => {
    const snapshot = { col_id, columnInfo, units, boundaries, isDraft };
    return [[snapshotAtom, snapshot]] as [any, any][];
  }, [col_id, columnInfo, units, boundaries, isDraft]);

  return h(HybridPage, {
    key: col_id ?? "draft",
    className: "column-editor-page",
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

/** What this column is: the experiment's own warning, and whether the column
 * has ever been written. Sits with the title, not with the controls. */
function EditorContext() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);

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

/** Leaving the editor — a navigation action, so it keeps the title row. */
function EditorNavigation() {
  return h(Button, {
    icon: "cross",
    text: "Close",
    minimal: true,
    // Leaving the editor is leaving the column: back to the picker.
    onClick: () => {
      window.location.href = EDITOR_BASE;
    },
  });
}

function exportTitle(errorCount: number): string | undefined {
  if (errorCount === 0) return undefined;
  return `${errorCount} cell${errorCount === 1 ? "" : "s"} need fixing first`;
}

/** Reset and export: they act on the transaction, so they sit on the toolbar
 * row with the mode control rather than beside the title. */
function TransactionActions() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const resetEdits = useSetAtom(resetEditsAtom);
  const units = useAtomValue(editedUnitsAtom);
  const blockingIssues = useAtomValue(blockingIssuesAtom);

  const onExport = useCallback(() => {
    const csv = unitsToCSV(units);
    downloadText(`column-${snapshot?.col_id ?? "draft"}-units.csv`, csv);
  }, [units, snapshot?.col_id]);

  return h(ButtonGroup, { minimal: true }, [
    h(Button, {
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

/** Everything that acts on the column: which table is being edited, how it is
 * drawn, which panes frame it, and what to do with the transaction. In the
 * header's second row, directly above the sheet it acts on. */
function EditorToolbar() {
  const [mode, setMode] = useAtom(editingModeAtom);
  const [columnVisible, setColumnVisible] = useAtom(columnVisibleAtom);
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
    // Both framing panes give way to the sheet: a wide table is the reason to
    // hide either of them.
    h(Button, {
      icon: "vertical-bar-chart-asc",
      minimal: true,
      small: true,
      active: columnVisible,
      text: "Column",
      onClick: () => setColumnVisible(!columnVisible),
    }),
    h(Button, {
      icon: "panel-stats",
      minimal: true,
      small: true,
      active: inspectorOpen,
      text: "Details",
      onClick: () => setInspectorOpen(!inspectorOpen),
    }),
  ]);
}

/* --------------------------------------------------------------- content */

/** Column, sheet and inspector, side by side, filling the viewport. The
 * inspector is part of the working surface here rather than the frame's
 * assistant slot, which `content-full` doesn't render. */
function EditorContent() {
  const mode = useAtomValue(editingModeAtom);
  const columnVisible = useAtomValue(columnVisibleAtom);
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

  let inspector = null;
  if (inspectorOpen) {
    inspector = h(
      "div.editor-inspector-pane",
      h(ErrorBoundary, h(EditorInspector))
    );
  }

  return h(
    "div.editor-content",
    { className: classNames(`mode-${mode}`) },
    [column, h("div.editor-sheet-pane", h(ErrorBoundary, sheet)), inspector]
  );
}
