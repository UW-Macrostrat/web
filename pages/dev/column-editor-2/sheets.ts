/** The two editing tables: units (the ingestion `units` sheet, more or less)
 * and surfaces (the age model). Both are `DataSheet`s over the editor's atoms
 * with immediate-commit edits: a cell edit patches the store, the store
 * re-renders the sheet, and the sheet's own edit overlay is cleared. */
import hyper from "@macrostrat/hyper";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import type { UnitLong } from "@macrostrat/api-types";
import {
  type ColumnSpec,
  DataSheet,
  DataSheetDensity,
  type EditEvent,
  useSelector,
} from "@macrostrat/data-sheet";
import {
  editVersionAtom,
  moveSurfaceAtom,
  patchUnitsAtom,
  selectedSurfaceIDAtom,
  selectedUnitIDAtom,
  surfacesAtom,
  type UnitPatch,
  unitsAtom,
} from "./state";
import {
  type EditorSurface,
  formatProportion,
  surfaceStatusLabels,
} from "./surfaces";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/* ------------------------------------------------------------------- units */

/** Fields that hold numbers; edited text is coerced before it reaches the
 * store, and an unparseable value is ignored. */
const NUMERIC_UNIT_FIELDS = new Set([
  "t_age",
  "b_age",
  "t_prop",
  "b_prop",
  "min_thick",
  "max_thick",
  "b_pos",
  "t_pos",
]);

const EDITABLE_UNIT_FIELDS = new Set([
  "unit_name",
  "t_age",
  "b_age",
  "min_thick",
  "max_thick",
  "b_pos",
  "t_pos",
  "notes",
]);

/** The units sheet, in the ingestion format's vocabulary: position,
 * chronostratigraphic position, names, lithology, environment, thickness. */
const unitColumnSpec: ColumnSpec[] = [
  { key: "unit_id", name: "ID", dataType: "integer", width: 70 },
  { key: "unit_name", name: "Unit name", dataType: "string", width: 200 },
  {
    key: "strat_name_long",
    name: "Strat. name",
    dataType: "string",
    width: 180,
  },
  { key: "b_pos", name: "b_pos", dataType: "number", width: 70 },
  { key: "t_pos", name: "t_pos", dataType: "number", width: 70 },
  { key: "b_int_name", name: "b_int", dataType: "string", width: 120 },
  {
    key: "b_age",
    name: "b_age (Ma)",
    dataType: "number",
    width: 100,
    validate: validateAge,
  },
  { key: "t_int_name", name: "t_int", dataType: "string", width: 120 },
  {
    key: "t_age",
    name: "t_age (Ma)",
    dataType: "number",
    width: 100,
    validate: validateAge,
  },
  {
    key: "lith",
    name: "Lithology",
    dataType: "array",
    width: 220,
    valueRenderer: renderLithology,
  },
  {
    key: "environ",
    name: "Environment",
    dataType: "array",
    width: 160,
    valueRenderer: renderNames,
  },
  { key: "min_thick", name: "Min. thickness", dataType: "number", width: 90 },
  { key: "max_thick", name: "Max. thickness", dataType: "number", width: 90 },
  { key: "notes", name: "Notes", dataType: "text", width: 240 },
];

function validateAge(value: any) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (isNaN(n)) return { severity: "error" as const, message: "Not a number" };
  if (n < 0) return { severity: "error" as const, message: "Ages are ≥ 0" };
  return null;
}

function renderLithology(value: UnitLong["lith"]): string {
  if (value == null) return "";
  return value
    .map((d) => {
      let text = d.name;
      if (d.prop != null) text += ` (${Math.round(d.prop * 100)}%)`;
      return text;
    })
    .join("; ");
}

function renderNames(value: { name: string }[] | null | undefined): string {
  if (value == null) return "";
  return value.map((d) => d.name).join("; ");
}

export function UnitsSheet() {
  const units = useAtomValue(unitsAtom);
  const patchUnits = useSetAtom(patchUnitsAtom);

  const onEdit = useCallback(
    (event: EditEvent<UnitLong>) => {
      if (event.type !== "setCells") return;
      const patches: UnitPatch[] = [];
      for (const { row, column, value } of event.cells) {
        if (row == null || !EDITABLE_UNIT_FIELDS.has(column)) continue;
        let next: any = value;
        if (NUMERIC_UNIT_FIELDS.has(column)) {
          next = Number(value);
          if (value === "" || value == null || isNaN(next)) continue;
        }
        if (next === row[column]) continue;
        patches.push({ unit_id: row.unit_id, changes: { [column]: next } });
      }
      patchUnits(patches);
    },
    [patchUnits]
  );

  return h(
    "div.editor-sheet.units-sheet",
    h(
      DataSheet<UnitLong>,
      {
        data: units,
        columnSpec: unitColumnSpec,
        identity: unitIdentity,
        name: "Units",
        itemLabel: "unit",
        editable: true,
        enableColumnReordering: false,
        density: DataSheetDensity.MEDIUM,
        onEdit,
        deriveOverlay: useImmediateCommitOverlay(),
      },
      h(UnitSelectionBridge)
    )
  );
}

const unitIdentity = (row: UnitLong) => row?.unit_id;

/** The sheet's row selection is the editor's selected unit, both ways. */
function UnitSelectionBridge() {
  const selectedUnitID = useAtomValue(selectedUnitIDAtom);
  const setSelectedUnitID = useSetAtom(selectedUnitIDAtom);
  useSheetSelectionBridge<UnitLong>(
    (row) => row.unit_id,
    selectedUnitID,
    setSelectedUnitID
  );
  return null;
}

/* ---------------------------------------------------------------- surfaces */

const surfaceColumnSpec: ColumnSpec[] = [
  {
    key: "age",
    name: "Age (Ma)",
    dataType: "number",
    width: 110,
    validate: validateAge,
  },
  {
    key: "status",
    name: "Status",
    dataType: "string",
    width: 100,
    valueRenderer: (d) => surfaceStatusLabels[d] ?? d,
  },
  { key: "type", name: "Contact", dataType: "string", width: 110 },
  {
    key: "calibration",
    name: "Calibration",
    dataType: "object",
    width: 160,
    valueRenderer: (d) => d?.name ?? "",
  },
  {
    key: "proportion",
    name: "Position in interval",
    dataType: "number",
    width: 120,
    valueRenderer: formatProportion,
  },
  {
    key: "unitsAbove",
    name: "Units above",
    dataType: "array",
    width: 200,
    valueRenderer: renderUnitNames,
  },
  {
    key: "unitsBelow",
    name: "Units below",
    dataType: "array",
    width: 200,
    valueRenderer: renderUnitNames,
  },
  { key: "boundary_id", name: "Boundary", dataType: "integer", width: 90 },
];

/** Unit ids resolved to names, through a row-render context we don't have: the
 * spec is static, so the renderer reads a module-level map kept current by
 * `SurfacesSheet`. */
let unitNameLookup = new Map<number, string>();
function renderUnitNames(ids: number[] | null | undefined): string {
  if (ids == null) return "";
  return ids.map((id) => unitNameLookup.get(id) ?? `#${id}`).join("; ");
}

export function SurfacesSheet() {
  const surfaces = useAtomValue(surfacesAtom);
  const units = useAtomValue(unitsAtom);
  const moveSurface = useSetAtom(moveSurfaceAtom);

  unitNameLookup = useMemo(
    () => new Map(units.map((u) => [u.unit_id, u.unit_name])),
    [units]
  );

  const onEdit = useCallback(
    (event: EditEvent<EditorSurface>) => {
      if (event.type !== "setCells") return;
      for (const { row, column, value } of event.cells) {
        if (row == null || column !== "age") continue;
        const age = Number(value);
        if (value === "" || isNaN(age)) continue;
        moveSurface({ surfaceID: row.id, age });
      }
    },
    [moveSurface]
  );

  return h(
    "div.editor-sheet.surfaces-sheet",
    h(
      DataSheet<EditorSurface>,
      {
        data: surfaces,
        columnSpec: surfaceColumnSpec,
        identity: surfaceIdentity,
        name: "Surfaces",
        itemLabel: "surface",
        editable: true,
        enableColumnReordering: false,
        density: DataSheetDensity.MEDIUM,
        onEdit,
        deriveOverlay: useImmediateCommitOverlay(),
      },
      h(SurfaceSelectionBridge)
    )
  );
}

const surfaceIdentity = (row: EditorSurface) => row?.id;

function SurfaceSelectionBridge() {
  const selectedID = useAtomValue(selectedSurfaceIDAtom);
  const setSelectedID = useSetAtom(selectedSurfaceIDAtom);
  useSheetSelectionBridge<EditorSurface>(
    (row) => row.id,
    selectedID,
    setSelectedID
  );
  return null;
}

/* ------------------------------------------------------------------ shared */

const EMPTY_OVERLAY = { updatedData: [], rowStatus: [] };

/** Edits commit to the store immediately, so the sheet never holds pending
 * changes of its own: the overlay is re-derived (empty) on every edit. */
function useImmediateCommitOverlay() {
  const version = useAtomValue(editVersionAtom);
  return useMemo(() => () => EMPTY_OVERLAY, [version]);
}

/** Mirror the sheet's selection (the first selected row) into a page atom.
 * Must be rendered inside the sheet, where its store is in scope. */
function useSheetSelectionBridge<T>(
  identity: (row: T) => string | number,
  selectedID: string | number | null,
  setSelectedID: (id: any) => void
) {
  const selection = useSelector((state) => state.selection);
  const data = useSelector((state) => state.data) as T[] | undefined;
  const filteredRowIndices = useSelector(
    (state) => state.filteredRowIndices
  ) as number[] | null | undefined;

  useEffect(() => {
    const region = selection?.[0];
    const viewIndex = region?.rows?.[0];
    if (viewIndex == null || data == null) return;
    const baseIndex = filteredRowIndices?.[viewIndex] ?? viewIndex;
    const row = data[baseIndex];
    if (row == null) return;
    const id = identity(row);
    if (id !== selectedID) setSelectedID(id);
  }, [selection]);
}
