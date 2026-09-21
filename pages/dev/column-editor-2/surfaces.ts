/** Surfaces for the editor: every distinct unit top or bottom in the column,
 * annotated with the age model's boundary where one matches.
 *
 * This is the editor's projection of its units — a surface is not stored, it
 * is *derived*, and editing a surface's age moves every unit hung on it. The
 * records are `ColumnSurface`s from `@macrostrat/column-views`, so they drop
 * straight into the library's surfaces view and its details panel; only the
 * way they are built is the editor's own.
 */
import type { UnitLong } from "@macrostrat/api-types";
import {
  type AgeModelBoundary,
  type ColumnSurface,
  type SurfaceCalibration,
  nullifyUnitID,
} from "@macrostrat/column-views";

/** A surface in the editor. Its id is built from the units it separates, so
 * it survives an age edit and the selection holds. */
export interface EditorSurface extends ColumnSurface {
  id: string;
}

/** Ages closer than this are one surface */
export const AGE_TOLERANCE = 0.001;

export function buildEditorSurfaces(
  units: UnitLong[] | null | undefined,
  boundaries: AgeModelBoundary[] | null | undefined
): EditorSurface[] {
  if (units == null) return [];

  // 1. Merge unit tops and bottoms into surfaces by age
  const drafts: Omit<EditorSurface, "id">[] = [];
  function addBound(unit: UnitLong, top: boolean) {
    const age = top ? unit.t_age : unit.b_age;
    if (age == null || isNaN(age)) return;
    let surface = drafts.find((d) => Math.abs(d.age - age) < AGE_TOLERANCE);
    if (surface == null) {
      surface = {
        age,
        status: "derived",
        type: "",
        calibration: null,
        proportion: null,
        unitsAbove: [],
        unitsBelow: [],
        section_id: unit.section_id ?? null,
      };
      drafts.push(surface);
    }
    // The unit whose top this is lies below the surface, and vice versa
    if (top) {
      surface.unitsBelow.push(unit.unit_id);
    } else {
      surface.unitsAbove.push(unit.unit_id);
    }
  }
  for (const unit of units) {
    addBound(unit, true);
    addBound(unit, false);
  }

  // 2. Attach the age model's boundary, matched by the units it separates
  //    (robust to the age having been edited), else by age.
  const remaining = [...(boundaries ?? [])];
  for (const surface of drafts) {
    let match = remaining.find((b) => boundaryMatchesUnits(b, surface));
    if (match == null) {
      match = remaining.find(
        (b) => Math.abs(b.model_age - surface.age) < AGE_TOLERANCE
      );
    }
    if (match == null) continue;
    remaining.splice(remaining.indexOf(match), 1);
    surface.status = match.boundary_status ?? "";
    surface.type = match.boundary_type ?? "";
    surface.boundary = match;
    surface.ref_id = match.ref_id ?? null;
    surface.position = match.boundary_position ?? null;
    surface.section_id = match.section_id ?? surface.section_id;
    if (match.interval_id != null) {
      surface.calibration = {
        id: match.interval_id,
        name: match.interval_name,
        b_age: match.age_bottom,
        t_age: match.age_top,
      };
      // The proportion follows the (possibly edited) age, so the calibration
      // label stays honest as a surface is moved.
      surface.proportion = proportionInInterval(
        surface.age,
        surface.calibration
      );
    }
  }

  drafts.sort((a, b) => a.age - b.age);
  return drafts.map((d) => ({ ...d, id: surfaceID(d) }));
}

function boundaryMatchesUnits(
  b: AgeModelBoundary,
  s: Omit<EditorSurface, "id">
): boolean {
  const above = nullifyUnitID(b.unit_above);
  const below = nullifyUnitID(b.unit_below);
  if (above == null && below == null) return false;
  const aboveOK = above == null || s.unitsAbove.includes(above);
  const belowOK = below == null || s.unitsBelow.includes(below);
  return aboveOK && belowOK;
}

function surfaceID(s: Omit<EditorSurface, "id">): string {
  const below = [...s.unitsBelow].sort((a, b) => a - b).join(".");
  const above = [...s.unitsAbove].sort((a, b) => a - b).join(".");
  return `s:${below}/${above}`;
}

export function proportionInInterval(
  age: number,
  interval: SurfaceCalibration | null
): number | null {
  if (interval == null) return null;
  const span = interval.b_age - interval.t_age;
  if (span <= 0) return null;
  const prop = (interval.b_age - age) / span;
  return Math.min(Math.max(prop, 0), 1);
}
