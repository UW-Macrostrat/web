/** `/dev/column-editor-2` — an experimental column editor on the hybrid frame.
 *
 * The column (with its surfaces drawn on) and the editing sheet are the
 * content; the navigation map picks the column; the assistant summarizes it.
 * One store of units is edited two ways — as the ingestion-format `units`
 * table, or as the age model's surfaces — and the column redraws live. Edits
 * are local (there is no write API yet): reset returns to the column as
 * loaded, export writes a `units` sheet in the column-ingestion format.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useCallback, useMemo, useState } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Button,
  ButtonGroup,
  ControlGroup,
  NumericInput,
  SegmentedControl,
} from "@blueprintjs/core";
import { navigate } from "vike/client/router";
import { MacrostratDataProvider } from "@macrostrat/data-provider";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import { onDemand } from "~/_utils";
import { AlphaTag } from "~/components";
import { HybridPage, type LayoutCapabilities } from "~/layouts/hybrid";
import { Footer } from "~/layouts/footer";
import type { ColumnEditorData } from "./+data";
import { EditorColumn } from "./column-view";
import { EditorInspector } from "./inspector";
import { SurfacesSheet, UnitsSheet } from "./sheets";
import {
  type EditingMode,
  editingModeAtom,
  isDirtyAtom,
  resetEditsAtom,
  snapshotAtom,
  surfacesAtom,
  unitsAtom,
} from "./state";
import { downloadText, unitsToCSV } from "./export";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const ColumnMap = onDemand(() =>
  import("../../columns/@column/column-inspector/map").then(
    (mod) => mod.ColumnMap
  )
);

/** The content is a column plus a wide sheet, so full width is offered; the
 * page scrolls as one document. */
const capabilities: Partial<LayoutCapabilities> = {
  modes: ["content-primary", "content-full"],
  defaultMode: "content-primary",
  hasAssistant: true,
  itemName: "Editor",
  contentScroll: "page",
};

export function ColumnEditorPage(props: ColumnEditorData) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnEditorFrame, props))
  );
}

function ColumnEditorFrame(props: ColumnEditorData) {
  const { col_id, columnInfo, units, boundaries } = props;

  // The frame isolates every atom below it, so the column is seeded through
  // `initialAtoms`; keying on the column remounts the frame (and re-seeds)
  // when the map or the picker navigates to another one.
  const initialAtoms = useMemo(() => {
    const snapshot = { col_id, columnInfo, units, boundaries };
    return [
      [snapshotAtom, snapshot],
      [unitsAtom, units],
    ] as [any, any][];
  }, [col_id, columnInfo, units, boundaries]);

  return h(HybridPage, {
    key: col_id,
    className: "column-editor-page",
    capabilities,
    initialAtoms,
    actions: h(EditorActions),
    filterBar: h(EditorModeBar),
    content: h(EditorContent),
    map: h(EditorMapPane, { col_id }),
    assistant: h(ErrorBoundary, h(EditorInspector)),
  });
}

/* ---------------------------------------------------------------- header */

/** Column picker, reset and export, beside the frame's layout controls */
function EditorActions() {
  const snapshot = useAtomValue(snapshotAtom);
  const isDirty = useAtomValue(isDirtyAtom);
  const resetEdits = useSetAtom(resetEditsAtom);
  const units = useAtomValue(unitsAtom);

  const onExport = useCallback(() => {
    const csv = unitsToCSV(units);
    downloadText(`column-${snapshot?.col_id ?? "units"}-units.csv`, csv);
  }, [units, snapshot?.col_id]);

  return h("div.editor-actions", [
    h(AlphaTag, {
      content:
        "An experimental editor. Edits stay in the page: reset discards them, export writes a units sheet in the column-ingestion format.",
    }),
    h(ColumnPicker, { col_id: snapshot?.col_id }),
    h(ButtonGroup, [
      h(Button, {
        icon: "reset",
        text: "Reset",
        disabled: !isDirty,
        onClick: resetEdits,
      }),
      h(Button, {
        icon: "download",
        text: "Export CSV",
        onClick: onExport,
      }),
    ]),
  ]);
}

function ColumnPicker({ col_id }: { col_id: number | undefined }) {
  const [value, setValue] = useState<number | undefined>(col_id);
  const go = useCallback(() => {
    if (value == null || isNaN(value) || value === col_id) return;
    navigate(editorHref(value));
  }, [value, col_id]);

  return h(ControlGroup, { className: "column-picker" }, [
    h(NumericInput, {
      value: value ?? "",
      min: 1,
      buttonPosition: "none",
      placeholder: "Column ID",
      onValueChange: (n: number) => setValue(n),
      onKeyDown(evt) {
        if (evt.key === "Enter") go();
      },
      className: "column-id-input",
    }),
    h(Button, { icon: "arrow-right", onClick: go, title: "Open column" }),
  ]);
}

export function editorHref(col_id: number): string {
  const url = new URL(window.location.href);
  url.searchParams.set("col_id", String(col_id));
  return url.pathname + url.search;
}

/** Units ⇄ surfaces, with counts and the dirty state, in the header's second
 * row so it sits directly above the sheet. */
function EditorModeBar() {
  const [mode, setMode] = useAtom(editingModeAtom);
  const units = useAtomValue(unitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const isDirty = useAtomValue(isDirtyAtom);

  return h("div.editor-mode-bar", [
    h(SegmentedControl, {
      small: true,
      options: [
        { label: `Units (${units.length})`, value: "units" },
        { label: `Surfaces (${surfaces.length})`, value: "surfaces" },
      ],
      value: mode,
      onValueChange: (value: EditingMode) => setMode(value),
    }),
    h.if(isDirty)("span.dirty-indicator", "Unsaved edits"),
  ]);
}

/* --------------------------------------------------------------- content */

function EditorContent() {
  const mode = useAtomValue(editingModeAtom);

  let sheet = h(UnitsSheet);
  if (mode === "surfaces") {
    sheet = h(SurfacesSheet);
  }

  return h("div.editor-content", [
    h("div.editor-main", [
      h(
        "div.editor-column-pane",
        { className: classNames(`mode-${mode}`) },
        h(ErrorBoundary, h(EditorColumn))
      ),
      h(
        "div.editor-sheet-pane",
        { className: classNames(`mode-${mode}`) },
        h(ErrorBoundary, sheet)
      ),
    ]),
    h(Footer, { className: "page-footer" }),
  ]);
}

/* ------------------------------------------------------------------- map */

function EditorMapPane({ col_id }: { col_id: number }) {
  const onSelectColumn = useCallback(
    (nextID: number | null) => {
      if (nextID == null || nextID === col_id) return;
      navigate(editorHref(nextID), { overwriteLastHistoryEntry: true });
    },
    [col_id]
  );

  return h("div.editor-map-pane", [
    h(ColumnMap, {
      className: "column-map",
      inProcess: true,
      projectID: 1,
      selectedColumn: col_id,
      onSelectColumn,
    }),
    h("div.map-hint", "Click a column to edit it"),
  ]);
}
