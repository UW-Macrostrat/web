/** Surfaces for the editor: every distinct unit boundary in the column,
 * annotated with the age model's boundary where one matches.
 *
 * This is the editor's projection of its units — a surface is not stored, it
 * is *derived*, and editing a surface moves every unit hung on it. The records
 * are `ColumnSurface`s from `@macrostrat/column-views`, so they drop straight
 * into the library's surfaces view and its details panel; only the way they
 * are built is the editor's own.
 *
 * **Two indexes.** On an age column a surface is a distinct `t_age`/`b_age`;
 * on a measured column (height or depth — the eODP holes) it is a distinct
 * `t_pos`/`b_pos`, and the age comes along for the ride. Which one is in force
 * is the height-scale mode (see `./display.ts`), and it decides what an edit
 * writes back: an age, or a position.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import {
  type AgeModelBoundary,
  type ColumnSurface,
  type SurfaceCalibration,
  compareAlongAxis,
  inferTiePointStatuses,
  isPositionAxis,
  nullifyUnitID,
} from "@macrostrat/column-views";
import { positionValue } from "./scale";
import {
  AGE_TOLERANCE,
  POSITION_TOLERANCE,
  proportionForAge,
} from "./boundaries";

export { AGE_TOLERANCE, POSITION_TOLERANCE };

/** A surface in the editor. Its id is built from the units it separates, so
 * it survives an edit and the selection holds. */
export interface EditorSurface extends ColumnSurface {
  id: string;
}

/** The unit field a surface is keyed on, for one side of a unit. */
function unitCoordinate(
  unit: UnitLong,
  top: boolean,
  positionAxis: boolean
): number | null {
  if (positionAxis) {
    return positionValue(top ? unit.t_pos : unit.b_pos);
  }
  const age = top ? unit.t_age : unit.b_age;
  if (age == null || isNaN(age)) return null;
  return age;
}

export function buildEditorSurfaces(
  units: UnitLong[] | null | undefined,
  boundaries: AgeModelBoundary[] | null | undefined,
  axisType: ColumnAxisType = ColumnAxisType.AGE
): EditorSurface[] {
  if (units == null) return [];

  const positionAxis = isPositionAxis(axisType);
  const tolerance = positionAxis ? POSITION_TOLERANCE : AGE_TOLERANCE;

  // 1. Merge unit tops and bottoms into surfaces, by whichever coordinate the
  //    axis is indexed on
  const drafts: Omit<EditorSurface, "id">[] = [];
  function addBound(unit: UnitLong, top: boolean) {
    const coord = unitCoordinate(unit, top, positionAxis);
    if (coord == null) return;
    const age = top ? unit.t_age : unit.b_age;
    let surface = drafts.find(
      (d) => Math.abs(surfaceCoordinate(d, positionAxis) - coord) < tolerance
    );
    if (surface == null) {
      surface = {
        age: age ?? NaN,
        position: positionAxis ? coord : null,
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
  //    (robust to the coordinate having been edited), else by coordinate.
  const remaining = [...(boundaries ?? [])];
  for (const surface of drafts) {
    let match = remaining.find((b) => boundaryMatchesUnits(b, surface));
    if (match == null) {
      match = remaining.find((b) =>
        boundaryMatchesCoordinate(b, surface, positionAxis, tolerance)
      );
    }
    if (match == null) continue;
    remaining.splice(remaining.indexOf(match), 1);
    surface.status = match.boundary_status ?? "";
    surface.type = match.boundary_type ?? "";
    surface.boundary = match;
    surface.ref_id = match.ref_id ?? null;
    surface.position = surface.position ?? match.boundary_position ?? null;
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
      surface.proportion = proportionForAge(
        surface.calibration,
        surface.age
      );
    }
  }

  drafts.sort((a, b) =>
    compareAlongAxis(a as ColumnSurface, b as ColumnSurface, axisType)
  );
  const built = drafts.map((d) => ({ ...d, id: surfaceID(d) }));

  // `useColumnSurfaces` runs this over an age model it fetched itself, but
  // hands provided surfaces through untouched — so the editor, which builds
  // its own, has to apply it. It promotes the `modeled` surfaces that cannot
  // in fact have been interpolated (they sit on an interval bound, or bound a
  // gap-bound package) to `relative`, marking them `statusInferred`. Without
  // it the importer's blanket `modeled` hides most of the real tie points,
  // and the labels — which follow the tie-point statuses — go with them.
  return inferTiePointStatuses(built) as EditorSurface[];
}

/** The coordinate a surface is merged and ordered on. */
function surfaceCoordinate(
  s: Omit<EditorSurface, "id">,
  positionAxis: boolean
): number {
  if (positionAxis) return s.position ?? NaN;
  return s.age;
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

function boundaryMatchesCoordinate(
  b: AgeModelBoundary,
  s: Omit<EditorSurface, "id">,
  positionAxis: boolean,
  tolerance: number
): boolean {
  if (positionAxis) {
    const position = positionValue(b.boundary_position);
    if (position == null || s.position == null) return false;
    return Math.abs(position - s.position) < tolerance;
  }
  return Math.abs(b.model_age - s.age) < tolerance;
}

function surfaceID(s: Omit<EditorSurface, "id">): string {
  const below = [...s.unitsBelow].sort((a, b) => a - b).join(".");
  const above = [...s.unitsAbove].sort((a, b) => a - b).join(".");
  return `s:${below}/${above}`;
}
