/** Turning a sheet's edits into transaction entries.
 *
 * This is the only place that knows what a cell edit *means*. A `DataSheet`
 * reports one, structurally, through `onEdit`; these actions decide which
 * units it touches and which of their fields change, and hand the result to
 * `applyUnitEditsAtom`. Nothing is refused here — an edit that makes the
 * column inconsistent is recorded and flagged (see `../validation`).
 */
import { atom } from "jotai";
import type { UnitLong } from "@macrostrat/api-types";
import type { ColumnSpec, EditEvent } from "@macrostrat/data-sheet";
import {
  ageForProportion,
  boundaryFieldInfo,
  boundaryTolerance,
  readBoundaryEdit,
  sideChanges,
  unitBoundary,
  type BoundaryKind,
  type BoundarySide,
  type BoundaryValues,
  type IntervalDef,
} from "../boundaries";
import {
  applyUnitEditsAtom,
  editedUnitsAtom,
  resetEditsAtom,
  type UnitFieldEdit,
} from "./column";
import { preserveSurfacesAtom } from "./options";
import { surfacesAtom } from "./surfaces";
import type { EditorSurface } from "../surfaces";

export type IntervalMap = Map<number, IntervalDef> | null;

/* --------------------------------------------------------- one boundary */

/** Move one unit's boundary.
 *
 * With `preserveSurfaces` on, every unit that shared the old value comes
 * along — a unit meeting it from below has its top moved, one from above its
 * bottom — so the surface survives the edit. With it off only the row's own
 * unit moves, which is how the ingestion spreadsheet behaves and how a shared
 * surface gets split. */
export const editBoundaryAtom = atom(
  null,
  (
    get,
    set,
    {
      unit_id,
      side,
      kind,
      values,
    }: {
      unit_id: number;
      side: BoundarySide;
      kind: BoundaryKind;
      values: BoundaryValues;
    }
  ) => {
    set(applyUnitEditsAtom, boundaryEdits(get(editedUnitsAtom), {
      unit_id,
      side,
      kind,
      values,
      preserveSurfaces: get(preserveSurfacesAtom),
    }));
  }
);

function boundaryEdits(
  units: UnitLong[],
  opts: {
    unit_id: number;
    side: BoundarySide;
    kind: BoundaryKind;
    values: BoundaryValues;
    preserveSurfaces: boolean;
  }
): UnitFieldEdit[] {
  const { unit_id, side, kind, values, preserveSurfaces } = opts;
  const unit = units.find((d) => d.unit_id === unit_id);
  if (unit == null) return [];

  const edits: UnitFieldEdit[] = [
    { unit_id, changes: sideChanges(side, values) },
  ];

  const previous = unitBoundary(unit, side, kind);
  const moved = kind === "position" ? values.pos : values.age;
  if (!preserveSurfaces || previous == null || moved == null) return edits;

  const tolerance = boundaryTolerance(kind);
  for (const other of units) {
    if (other.unit_id === unit_id) continue;
    for (const otherSide of ["top", "bottom"] as BoundarySide[]) {
      const value = unitBoundary(other, otherSide, kind);
      if (value == null || Math.abs(value - previous) >= tolerance) continue;
      edits.push({
        unit_id: other.unit_id,
        changes: sideChanges(otherSide, values),
      });
    }
  }
  return edits;
}

/* ------------------------------------------------- a sheet's edit events */

/** Cell edits on a unit-backed sheet (units, unified).
 *
 * The **column spec decides what may be written**, and it is the only thing
 * that does. A locked column is locked however the edit arrived: the cell
 * renderer declines to offer an editor for one, but a fill or a paste writes
 * across the whole column range of a selection without consulting the spec, so
 * the check has to be made here too. It is also the only check — a second
 * allow-list beside the spec is a second opinion waiting to disagree with it.
 *
 * A boundary column goes through `editBoundaryAtom`; anything else is the
 * row's own field, coerced by the column's declared `dataType`. */
export const editUnitCellsAtom = atom(
  null,
  (
    get,
    set,
    {
      event,
      intervals,
      columnSpec,
    }: {
      event: EditEvent<UnitLong>;
      intervals: IntervalMap;
      columnSpec: ColumnSpec[];
    }
  ) => {
    if (event.type === "resetChanges") {
      set(resetEditsAtom);
      return;
    }
    if (event.type !== "setCells") return;

    const specs = new Map(columnSpec.map((spec) => [spec.key, spec]));
    const edits: UnitFieldEdit[] = [];

    for (const { row, column, value } of event.cells) {
      if (row == null) continue;
      const spec = specs.get(column);
      if (spec == null || spec.editable === false) continue;

      if (boundaryFieldInfo(column) != null) {
        const edit = readBoundaryEdit(row, column, value, intervals);
        if (edit == null) continue;
        set(editBoundaryAtom, { unit_id: row.unit_id, ...edit });
        continue;
      }

      let next: any = value;
      if (spec.dataType === "number" || spec.dataType === "integer") {
        if (value === "" || value == null) continue;
        next = Number(value);
      }
      edits.push({ unit_id: row.unit_id, changes: { [column]: next } });
    }
    set(applyUnitEditsAtom, edits);
  }
);

/** Cell edits on the surfaces sheet.
 *
 * A surface is a projection, so an edit there is a boundary move on every unit
 * hung on it — always, whatever `preserveSurfaces` says, because moving a
 * surface *is* what that table is for.
 *
 * What moves it follows the axis. A measured column's surfaces have a position
 * and that is the record. An age column's have a *calibration* — an interval
 * and a proportion within it — and the age falls out of the two, so the
 * proportion is the record and the age is read-only. A surface with no
 * calibration has nothing to move it by, and is left alone. */
export const editSurfaceCellsAtom = atom(
  null,
  (
    get,
    set,
    {
      event,
      coordinateKey,
    }: { event: EditEvent<any>; coordinateKey: "position" | "proportion" }
  ) => {
    if (event.type === "resetChanges") {
      set(resetEditsAtom);
      return;
    }
    if (event.type !== "setCells") return;

    const surfaces = get(surfacesAtom);
    const edits: UnitFieldEdit[] = [];

    for (const { row, column, value } of event.cells) {
      if (row == null || column !== coordinateKey) continue;
      const next = Number(value);
      if (value === "" || isNaN(next)) continue;
      const surface = surfaces.find((s) => s.id === row.id);
      if (surface == null) continue;

      const values = surfaceBoundaryValues(surface, coordinateKey, next);
      if (values == null) continue;

      // The unit below a surface meets it with its top, the unit above with
      // its base.
      for (const unit_id of surface.unitsBelow) {
        edits.push({ unit_id, changes: sideChanges("top", values) });
      }
      for (const unit_id of surface.unitsAbove) {
        edits.push({ unit_id, changes: sideChanges("bottom", values) });
      }
    }

    set(applyUnitEditsAtom, edits);
  }
);

function surfaceBoundaryValues(
  surface: EditorSurface,
  coordinateKey: "position" | "proportion",
  value: number
): BoundaryValues | null {
  if (coordinateKey === "position") return { pos: value };

  const calibration = surface.calibration;
  if (calibration == null) return null;
  const age = ageForProportion(
    { int_id: calibration.id, name: calibration.name, ...calibration },
    value
  );
  if (age == null) return null;
  return {
    prop: value,
    age,
    int_id: calibration.id,
    int_name: calibration.name,
  };
}
