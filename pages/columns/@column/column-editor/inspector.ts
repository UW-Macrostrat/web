/** The details pane beside the sheet: the selected unit or surface, else a
 * summary of the column and how this view works.
 *
 * In edit mode the selected record is shown through the **row editor** of
 * `@macrostrat/data-sheet` — its fields as a form, from **the same column
 * spec as the sheet that is showing**: the unified sheet's fields in unified
 * mode, the guided ones in units mode, a surface's in surfaces mode, and in
 * the same view (rich or plain). An edit made there goes through the sheet's
 * own edit path, so it means what the same edit in a cell means. The form is
 * fed the record and the transaction rather than bound to a sheet's store,
 * so it keeps working with the table hidden, which is how a column is edited
 * one record at a time. The library's details panel is a switch away, and is
 * what the table view shows.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { type ReactNode, useMemo } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Switch } from "@blueprintjs/core";
import {
  MacrostratColumnStateProvider,
  SurfaceDetailsPanel,
  UnitDetailsPanel,
} from "@macrostrat/column-views";
import { type ColumnSpec, RowEditor } from "@macrostrat/data-sheet";
import { DataField, Identifier } from "@macrostrat/data-components";
import type { UnitLong } from "@macrostrat/api-types";
import {
  applyUnitEditsAtom,
  baseSurfaceIndexAtom,
  columnScaleOptionsAtom,
  editModeAtom,
  editSurfaceCellsAtom,
  editUnitCellsAtom,
  editingModeAtom,
  isDraftColumnAtom,
  selectedSurfaceAtom,
  selectedSurfaceIDAtom,
  selectedUnitAtom,
  selectedUnitIDAtom,
  sheetUnitsAtom,
  sheetViewAtom,
  sheetVisibleAtom,
  snapshotAtom,
  surfaceOverlayFor,
  surfacesAtom,
  editedUnitsAtom,
  unitEditsAtom,
  useIntervalDefs,
} from "./state";
import {
  useSurfaceSheetColumns,
  useUnifiedSheetColumns,
  useUnitSheetColumns,
} from "./sheets";
import { plainListField, usePlainVocabularies } from "./cell-surfaces";
import { formatEnvironments, formatLithologies } from "./plain-values";
import type { EditorSurface } from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Whether the pane shows the form or the library's panel. Page state, not
 * URL state: which face of the record you are looking at. */
const showFormAtom = atom(true);

export function EditorInspector() {
  const mode = useAtomValue(editingModeAtom);
  const selectedUnit = useAtomValue(selectedUnitAtom);
  const selectedSurface = useAtomValue(selectedSurfaceAtom);

  if (mode === "surfaces" && selectedSurface != null) {
    return h(SurfaceInspector, { surface: selectedSurface });
  }
  if (mode !== "surfaces" && selectedUnit != null) {
    return h(UnitInspector, { unit: selectedUnit });
  }
  return h(EditorHelp, { mode });
}

/** The form, or the library's panel: a switch in edit mode, the panel in the
 * table view. */
function RecordInspector({ form, panel }: { form: ReactNode; panel: ReactNode }) {
  const edit = useAtomValue(editModeAtom);
  const [showForm, setShowForm] = useAtom(showFormAtom);
  if (!edit || !showForm) {
    return h([h.if(edit)(FormSwitch, { showForm, setShowForm }), panel]);
  }
  return h([h(FormSwitch, { showForm, setShowForm }), form]);
}

function FormSwitch({ showForm, setShowForm }) {
  return h(
    "div.inspector-switch",
    h(Switch, {
      checked: showForm,
      label: "Edit fields",
      alignIndicator: "right",
      onChange: () => setShowForm(!showForm),
    })
  );
}

/* ------------------------------------------------------------------ units */

function UnitInspector({ unit }: { unit: UnitLong }) {
  return h(RecordInspector, {
    form: h(UnitRowEditor, { unit }),
    panel: h(UnitDetailsView, { unit }),
  });
}

/** The library's panel: the unit as the column page shows it. It resolves
 * adjacent units' names through the column state scope. */
function UnitDetailsView({ unit }: { unit: UnitLong }) {
  const units = useAtomValue(editedUnitsAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  return h(
    MacrostratColumnStateProvider,
    { units },
    h(UnitDetailsPanel, {
      unit,
      className: "inspector-panel unit-inspector",
      onClose: () => setSelectedUnitID(null),
      onSelectUnit: setSelectedUnitID,
      showLithologyProportions: true,
    } as any)
  );
}

/** The columns of the unit sheet that is showing. */
function useUnitFormColumns(): ColumnSpec[] {
  const mode = useAtomValue(editingModeAtom);
  const view = useAtomValue(sheetViewAtom);
  const unified = useUnifiedSheetColumns();
  const units = useUnitSheetColumns();
  let columns = unified;
  if (mode === "units") columns = units;
  // The spreadsheet's list fields as text in the form, too (see
  // `plainListField`: until the library does this itself)
  return useMemo(() => {
    if (view !== "plain") return columns;
    return columns.map((col) => {
      if (col.key === "lith") {
        return { ...col, cellDetail: plainListLithologies };
      }
      if (col.key === "environ") {
        return { ...col, cellDetail: plainListEnvironments };
      }
      return col;
    });
  }, [columns, view]);
}

const plainListLithologies = plainListField(formatLithologies);
const plainListEnvironments = plainListField(formatEnvironments);

/**
 * The unit as a form, through the showing sheet's column spec — so the same
 * fields are writable, the same pickers or text cells take them, and the same
 * validation shows. A field edit is handed to the sheet's edit path as a cell
 * edit on the unit's row, so a boundary preserves surfaces and typed text is
 * read back exactly as it would be in the grid.
 */
function UnitRowEditor({ unit }: { unit: UnitLong }) {
  const columnSpec = useUnitFormColumns();
  const rows = useAtomValue(sheetUnitsAtom);
  const edits = useAtomValue(unitEditsAtom);
  const sheetVisible = useAtomValue(sheetVisibleAtom);
  const editCells = useSetAtom(editUnitCellsAtom);
  const applyEdits = useSetAtom(applyUnitEditsAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const intervals = useIntervalDefs();
  const vocabularies = usePlainVocabularies();

  // The row as the sheet holds it: as loaded (or as made), with its edits
  // laid over it
  const row = rows.find((u) => u.unit_id === unit.unit_id) ?? unit;
  const unitEdits = edits.get(unit.unit_id) ?? null;

  const onChange = (key: string, value: any) => {
    editCells({
      event: { type: "setCells", cells: [{ rowIndex: -1, column: key, value, row }] },
      intervals,
      columnSpec,
      vocabularies,
    });
  };

  // Writing the loaded value back drops the field from the transaction
  const onResetField = (key: string) => {
    applyEdits([{ unit_id: unit.unit_id, changes: { [key]: row[key] } }]);
  };

  return h(RowEditor<UnitLong>, {
    className: classNames("inspector-panel", "unit-row-editor", {
      standalone: !sheetVisible,
    }),
    columnSpec,
    row,
    edits: unitEdits,
    editable: true,
    panel: true,
    title: h("span.row-editor-title", [
      unit.unit_name || `Unit ${unit.unit_id}`,
      " ",
      h(Identifier, { id: unit.unit_id }),
    ]),
    onClose: () => setSelectedUnitID(null),
    closeLabel: "Clear selection",
    // With the table hidden this is the only place the identifiers and ages
    // can be seen, so the form shows what the sheet would hide.
    showHidden: !sheetVisible,
    onChange,
    onResetField,
  });
}

/* --------------------------------------------------------------- surfaces */

function SurfaceInspector({ surface }: { surface: EditorSurface }) {
  return h(RecordInspector, {
    form: h(SurfaceRowEditor, { surface }),
    panel: h(SurfaceDetailsView, { surface }),
  });
}

/** The surface as a form, through the surfaces sheet's column spec, its
 * edits handed to that sheet's edit path. */
function SurfaceRowEditor({ surface }: { surface: EditorSurface }) {
  const columnSpec = useSurfaceSheetColumns();
  const baseSurfaces = useAtomValue(baseSurfaceIndexAtom);
  const isDraft = useAtomValue(isDraftColumnAtom);
  const sheetVisible = useAtomValue(sheetVisibleAtom);
  const editCells = useSetAtom(editSurfaceCellsAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);
  const intervals = useIntervalDefs();
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);

  // A surface is a projection: what changed is its difference from the same
  // surface as loaded (nothing, for a new column's)
  let edits: Partial<EditorSurface> | null = null;
  if (!isDraft) edits = surfaceOverlayFor(baseSurfaces, [surface])[0] ?? null;

  const onChange = (key: string, value: any) => {
    editCells({
      event: {
        type: "setCells",
        cells: [{ rowIndex: -1, column: key, value, row: surface }],
      },
      coordinateKey: isPositionAxis ? "position" : "proportion",
      intervals,
    });
  };

  let title = "Surface";
  if (surface.calibration?.name) title = `Surface in ${surface.calibration.name}`;

  return h(RowEditor<EditorSurface>, {
    className: classNames("inspector-panel", "surface-row-editor", {
      standalone: !sheetVisible,
    }),
    columnSpec,
    row: surface,
    edits,
    editable: true,
    panel: true,
    title,
    onClose: () => setSelectedSurfaceID(null),
    closeLabel: "Clear selection",
    showHidden: !sheetVisible,
    onChange,
  });
}

/** The library's surface panel, wired to the editor's selection. It resolves
 * the units a surface separates through the column scope, so it sees the
 * edited units rather than the ones as loaded. */
function SurfaceDetailsView({ surface }: { surface: EditorSurface }) {
  const units = useAtomValue(editedUnitsAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const setMode = useSetAtom(editingModeAtom);

  const selectUnit = (id: number) => {
    setSelectedUnitID(id);
    setMode("unified");
  };

  return h(
    MacrostratColumnStateProvider,
    { units },
    h(SurfaceDetailsPanel, {
      surface,
      className: "inspector-panel surface-inspector",
      onClose: () => setSelectedSurfaceID(null),
      onSelectUnit: selectUnit,
    })
  );
}

/* ------------------------------------------------------------------- help */

function EditorHelp({ mode }) {
  const snapshot = useAtomValue(snapshotAtom);
  const units = useAtomValue(editedUnitsAtom);
  const surfaces = useAtomValue(surfacesAtom);
  const edit = useAtomValue(editModeAtom);
  const { isPositionAxis } = useAtomValue(columnScaleOptionsAtom);
  const info = snapshot?.columnInfo;

  const calibrated = surfaces.filter((s) => s.status !== "derived").length;

  // What a surface *is* follows the height scale, so the hint has to say
  // which coordinate an edit writes.
  let coordinate = "position in its calibration interval";
  if (isPositionAxis) coordinate = "measured position";

  let hint = "Select a unit in the column or the table to inspect it.";
  if (edit) {
    hint +=
      " Names, thicknesses, lithology and environment are edited here or in the table; the age correlation is edited in the Surfaces or Unified table.";
  }
  if (mode === "surfaces") {
    hint = `Select a surface (a line on the column, or a row) to inspect it.`;
    if (edit) {
      hint += ` Editing a surface's ${coordinate} moves every unit whose top or base sits on it.`;
    }
  } else if (mode === "unified") {
    hint =
      "The column-ingestion units sheet: each unit carries its own boundaries and the surfaces are implicit. Ages are derived from the intervals and proportions.";
    if (edit) {
      hint +=
        " Whether editing a boundary carries the units that shared it is the “preserve surfaces” setting.";
    }
  }

  return h("div.inspector-panel.editor-help", [
    h("h3", [
      info?.col_name ?? "Column",
      " ",
      h(Identifier, { id: snapshot?.col_id }),
    ]),
    h(DataField, { label: "Group", value: info?.col_group, row: true }),
    h(DataField, { label: "Units", value: units.length, row: true }),
    h(DataField, {
      label: "Surfaces",
      value: `${surfaces.length} (${calibrated} in the age model)`,
      row: true,
    }),
    h("p.inspector-hint", { className: classNames(mode) }, hint),
  ]);
}
