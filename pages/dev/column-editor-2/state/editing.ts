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
import type { EditEvent } from "@macrostrat/data-sheet";
import {
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
import { boundaryKindAtom, preserveSurfacesAtom } from "./options";
import { surfacesAtom } from "./surfaces";

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

/** Cell edits on a unit-backed sheet (units, unified). A boundary column goes
 * through `editBoundaryAtom`; anything else is the row's own field. */
export const editUnitCellsAtom = atom(
  null,
  (
    get,
    set,
    {
      event,
      intervals,
      editableFields,
      numericFields,
    }: {
      event: EditEvent<UnitLong>;
      intervals: IntervalMap;
      /** Non-boundary columns this sheet lets through */
      editableFields: Set<string>;
      /** Which of those hold numbers */
      numericFields: Set<string>;
    }
  ) => {
    if (event.type === "resetChanges") {
      set(resetEditsAtom);
      return;
    }
    if (event.type !== "setCells") return;

    const edits: UnitFieldEdit[] = [];
    for (const { row, column, value } of event.cells) {
      if (row == null) continue;

      if (boundaryFieldInfo(column) != null) {
        const edit = readBoundaryEdit(row, column, value, intervals);
        if (edit == null) continue;
        set(editBoundaryAtom, { unit_id: row.unit_id, ...edit });
        continue;
      }

      if (!editableFields.has(column)) continue;
      let next: any = value;
      if (numericFields.has(column)) {
        if (value === "" || value == null) continue;
        next = Number(value);
      }
      edits.push({ unit_id: row.unit_id, changes: { [column]: next } });
    }
    set(applyUnitEditsAtom, edits);
  }
);

/** Cell edits on the surfaces sheet. A surface is a projection, so an edit
 * there is a boundary move on every unit hung on it — which is what
 * `preserveSurfaces` does by default, applied to the surface's own units
 * whatever the setting says. Moving a surface *is* the whole point of that
 * table. */
export const editSurfaceCellsAtom = atom(
  null,
  (
    get,
    set,
    {
      event,
      coordinateKey,
    }: { event: EditEvent<any>; coordinateKey: "age" | "position" }
  ) => {
    if (event.type === "resetChanges") {
      set(resetEditsAtom);
      return;
    }
    if (event.type !== "setCells") return;

    const kind = get(boundaryKindAtom);
    const surfaces = get(surfacesAtom);
    const edits: UnitFieldEdit[] = [];

    for (const { row, column, value } of event.cells) {
      if (row == null || column !== coordinateKey) continue;
      const next = Number(value);
      if (value === "" || isNaN(next)) continue;
      const surface = surfaces.find((s) => s.id === row.id);
      if (surface == null) continue;

      const values: BoundaryValues =
        coordinateKey === "position" ? { pos: next } : { age: next };
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
