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
import { ErrorBoundary } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import { AlphaTag } from "~/components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import type { ColumnEditorData } from "./data";
import { EDITOR_BASE } from "./data";
import { EditorColumn } from "./column-view";
import { DisplaySettingsButton } from "./display";
import { EditorInspector } from "./inspector";
import { SurfacesSheet, UnifiedSheet, UnitsSheet } from "./sheets";
import {
  blockingIssuesAtom,
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
    actions: h(EditorActions),
    filterBar: h(EditorModeBar),
    content: h(EditorContent),
  });
}

/* ---------------------------------------------------------------- header */

/** Reset and export, beside the frame's own controls */
function EditorActions() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const resetEdits = useSetAtom(resetEditsAtom);
  const units = useAtomValue(editedUnitsAtom);
  const blockingIssues = useAtomValue(blockingIssuesAtom);

  const onExport = useCallback(() => {
    const csv = unitsToCSV(units);
    downloadText(`column-${snapshot?.col_id ?? "draft"}-units.csv`, csv);
  }, [units, snapshot?.col_id]);

  let draftTag = null;
  if (snapshot?.isDraft) {
    draftTag = h(
      Tag,
      { intent: "warning", minimal: true, className: "draft-tag" },
      "Unsaved column"
    );
  }

  return h("div.editor-actions", [
    h(AlphaTag, {
      content:
        "An experimental editor. Edits stay in the page: reset discards them, export writes a units sheet in the column-ingestion format.",
    }),
    draftTag,
    h(ButtonGroup, [
      h(Button, {
        icon: "cross",
        text: "Close",
        // Leaving the editor is leaving the column: back to the picker.
        onClick: () => {
          window.location.href = EDITOR_BASE;
        },
      }),
      h(Button, {
        icon: "reset",
        text: "Reset",
        disabled: !isDirty,
        onClick: resetEdits,
      }),
      h(Button, {
        icon: "download",
        text: "Export CSV",
        // An ingestion sheet with a unit overlapping its neighbour isn't worth
        // writing out; the sheet says which cells are at fault.
        disabled: blockingIssues.length > 0,
        title: exportTitle(blockingIssues.length),
        onClick: onExport,
      }),
    ]),
  ]);
}

function exportTitle(errorCount: number): string | undefined {
  if (errorCount === 0) return undefined;
  return `${errorCount} cell${errorCount === 1 ? "" : "s"} need fixing first`;
}

/** Units ⇄ surfaces, the dirty state, and the toggles for the two panes that
 * frame the sheet. In the header's second row, so it sits directly above the
 * sheet it switches. */
function EditorModeBar() {
  const [mode, setMode] = useAtom(editingModeAtom);
  const [columnVisible, setColumnVisible] = useAtom(columnVisibleAtom);
  const [inspectorOpen, setInspectorOpen] = useAtom(inspectorOpenAtom);
  const isDirty = useAtomValue(isDirtyAtom);

  return h("div.editor-mode-bar", [
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
    h.if(isDirty)("span.dirty-indicator", "Unsaved edits"),
    h("div.spacer"),
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
