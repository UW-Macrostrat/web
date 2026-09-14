/** Surfaces for the editor: every distinct unit top or bottom in the column,
 * annotated with the age model's boundary where one matches.
 *
 * This is the editor's projection of its units — a surface is not stored,
 * it is *derived*, and editing a surface's age moves every unit hung on it.
 * The record shape mirrors `ColumnSurface` in `@macrostrat/column-views` (the
 * surfaces view landing there), so the overlay here can be swapped for the
 * library component once that ships and is bumped in this repo.
 */
import type { UnitLong } from "@macrostrat/api-types";

/** `macrostrat.boundary_status`, as served by `/age_model` */
export type BoundaryStatus =
  | ""
  | "modeled"
  | "relative"
  | "absolute"
  | "spike"
  | "imposed";

export type SurfaceStatus = BoundaryStatus | "derived";

/** One row of `/age_model?col_id=` */
export interface AgeModelBoundary {
  boundary_id: number;
  col_id: number;
  section_id: number;
  interval_id: number;
  interval_name: string;
  age_bottom: number;
  age_top: number;
  rel_position: number;
  model_age: number;
  boundary_status: BoundaryStatus;
  boundary_type: string;
  boundary_position: number | null;
  unit_below: number | null;
  unit_above: number | null;
  ref_id: number;
}

export interface SurfaceCalibration {
  id: number;
  name: string;
  b_age: number;
  t_age: number;
}

export interface EditorSurface {
  /** Stable across age edits: built from the units the surface separates */
  id: string;
  age: number;
  status: SurfaceStatus;
  type: string;
  calibration: SurfaceCalibration | null;
  /** Position within the calibration interval: 0 at its base, 1 at its top */
  proportion: number | null;
  unitsAbove: number[];
  unitsBelow: number[];
  boundary_id: number | null;
  section_id: number | null;
}

export const surfaceStatusLabels: Record<SurfaceStatus, string> = {
  absolute: "Absolute",
  relative: "Relative",
  spike: "Spike",
  imposed: "Imposed",
  modeled: "Modeled",
  "": "Unspecified",
  derived: "Derived",
};

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
        boundary_id: null,
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
    surface.boundary_id = match.boundary_id;
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

/** Legacy `unit_boundaries` rows use `0` for "no unit" */
function nullifyUnitID(id: number | null | undefined): number | null {
  if (id == null || id === 0) return null;
  return id;
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

export function formatProportion(prop: number | null | undefined): string {
  if (prop == null) return "";
  return `${Math.round(prop * 100)}%`;
}

export function formatAge(age: number | null | undefined): string {
  if (age == null || isNaN(age)) return "";
  const value = age.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return `${value} Ma`;
}

/** Label for a surface: its calibration ("Calymmian · 85%") or its age */
export function surfaceLabel(surface: EditorSurface): string {
  if (surface.calibration != null) {
    const prop = formatProportion(surface.proportion);
    if (prop !== "") return `${surface.calibration.name} · ${prop}`;
    return surface.calibration.name;
  }
  return formatAge(surface.age);
}

/** CSS-safe token for a status or type */
export function surfaceToken(value: string | null | undefined): string {
  if (value == null || value === "") return "unspecified";
  return value.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}
