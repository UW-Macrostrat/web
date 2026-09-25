/** The details pane beside the sheet: the selected unit or surface, else a
 * summary of the column and how this view works.
 *
 * In edit mode a selected unit is shown through the **row editor** of
 * `@macrostrat/data-sheet` — its fields as a form, from the same column spec
 * as the units sheet, with the same pickers as the cells' surfaces. It is fed
 * the unit and the transaction rather than bound to a sheet's store, so it
 * keeps working with the table hidden, which is how a column is edited one
 * record at a time. The library's details panel is a switch away, and is
 * what the table view shows.
 */
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Switch } from "@blueprintjs/core";
import {
  MacrostratColumnStateProvider,
  SurfaceDetailsPanel,
  UnitDetailsPanel,
} from "@macrostrat/column-views";
import { RowEditor } from "@macrostrat/data-sheet";
import { DataField, Identifier } from "@macrostrat/data-components";
import type { UnitLong } from "@macrostrat/api-types";
import {
  applyUnitEditsAtom,
  baseUnitsAtom,
  columnScaleOptionsAtom,
  editBoundaryAtom,
  editModeAtom,
  editingModeAtom,
  selectedSurfaceAtom,
  selectedSurfaceIDAtom,
  selectedUnitAtom,
  selectedUnitIDAtom,
  sheetVisibleAtom,
  snapshotAtom,
  surfacesAtom,
  editedUnitsAtom,
  unitEditsAtom,
  useIntervalDefs,
} from "./state";
import { boundaryFieldInfo, readBoundaryEdit } from "./boundaries";
import { useUnitSheetColumns } from "./sheets";
import type { EditorSurface } from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** Whether the unit pane shows the form or the library's panel. Page state,
 * not URL state: which face of the record you are looking at. */
const showUnitFormAtom = atom(true);

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

/* ------------------------------------------------------------------ units */

function UnitInspector({ unit }: { unit: UnitLong }) {
  const edit = useAtomValue(editModeAtom);
  const [showForm, setShowForm] = useAtom(showUnitFormAtom);

  if (!edit || !showForm) {
    return h([
      h.if(edit)(FormSwitch, { showForm, setShowForm }),
      h(UnitDetailsView, { unit }),
    ]);
  }
  return h([
    h(FormSwitch, { showForm, setShowForm }),
    h(UnitRowEditor, { unit }),
  ]);
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

/**
 * The unit as a form, through the units sheet's own column spec — so the same
 * fields are writable, the same pickers open, and the same validation shows.
 * Edits go through the transaction like a cell edit does: a boundary field
 * through `editBoundaryAtom`, so preserving surfaces holds; anything else as
 * the unit's own field.
 */
function UnitRowEditor({ unit }: { unit: UnitLong }) {
  const columnSpec = useUnitSheetColumns();
  const baseUnits = useAtomValue(baseUnitsAtom);
  const edits = useAtomValue(unitEditsAtom);
  const sheetVisible = useAtomValue(sheetVisibleAtom);
  const applyEdits = useSetAtom(applyUnitEditsAtom);
  const editBoundary = useSetAtom(editBoundaryAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const intervals = useIntervalDefs();

  const base = baseUnits.find((u) => u.unit_id === unit.unit_id) ?? unit;
  const unitEdits = edits.get(unit.unit_id) ?? null;

  const onChange = (key: string, value: any) => {
    if (boundaryFieldInfo(key) != null) {
      const edit = readBoundaryEdit(unit, key, value, intervals);
      if (edit == null) return;
      editBoundary({ unit_id: unit.unit_id, ...edit });
      return;
    }
    const spec = columnSpec.find((c) => c.key === key);
    let next: any = value;
    if (spec?.dataType === "number" || spec?.dataType === "integer") {
      if (value === "" || value == null) return;
      next = Number(value);
    }
    applyEdits([{ unit_id: unit.unit_id, changes: { [key]: next } }]);
  };

  // Writing the loaded value back drops the field from the transaction
  const onResetField = (key: string) => {
    applyEdits([{ unit_id: unit.unit_id, changes: { [key]: base[key] } }]);
  };

  return h(RowEditor<UnitLong>, {
    className: classNames("inspector-panel", "unit-row-editor", {
      standalone: !sheetVisible,
    }),
    columnSpec,
    row: base,
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

/** The library's surface panel, wired to the editor's selection. It resolves
 * the units a surface separates through the column scope, so it sees the
 * edited units rather than the ones as loaded. */
function SurfaceInspector({ surface }: { surface: EditorSurface }) {
  const units = useAtomValue(editedUnitsAtom);
  const setSelectedSurfaceID = useSetAtom(selectedSurfaceIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  const setMode = useSetAtom(editingModeAtom);

  const selectUnit = (id: number) => {
    setSelectedUnitID(id);
    setMode("units");
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
