/** Surfaces as records, for a column built in the page.
 *
 * A loaded column's surfaces are a projection of its units (`./surfaces`): two
 * units meet where their boundary values agree. A new column has no values to
 * agree yet, so its surfaces are stored instead. Each unit points at a top and
 * a base surface (`t_surface` / `b_surface`), and its boundary fields are read
 * off them. A surface starts unconstrained and can be *constrained* — given a
 * position, or an interval and a proportion within it — at any time; units
 * can be filled in between surfaces that have none.
 *
 * **Working coordinates.** Every surface has a place even before it is
 * constrained, so the column can be drawn from the start. A constrained
 * surface sits at its value, and one given only an interval sits at the
 * interval's middle; the unconstrained ones between two placed surfaces are
 * spaced evenly between them, those past the last one continue at the
 * column's average spacing, and with nothing placed the surfaces are one unit
 * apart. A surface without an exact value is *speculative*, and is projected
 * with the age model's `modeled` status — it is an interpolation, which is
 * exactly what that status says.
 *
 * Pure model; the atoms are in `./state/column` and `./state/draft`.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import type { SurfaceCalibration } from "@macrostrat/column-views";
import type { EditorSurface } from "./surfaces";
import type { BoundarySide } from "./boundaries";

/** A surface of a new column. Its constraint is a position (on a measured
 * column) or an interval with an optional proportion, from which the age
 * follows; both may be absent. */
export interface DraftSurface {
  id: string;
  pos: number | null;
  int_id: number | null;
  int_name: string | null;
  prop: number | null;
  age: number | null;
  /** The interval's span, kept with the constraint so the calibration can be
   * drawn without the definitions to hand. */
  interval: { b_age: number; t_age: number } | null;
}

/** A unit of a new column: an ordinary unit record that also names its
 * surfaces. */
export type DraftUnit = UnitLong & { t_surface?: string; b_surface?: string };

export type DraftSurfaces = Map<string, DraftSurface>;

export function blankSurface(id: string): DraftSurface {
  return {
    id,
    pos: null,
    int_id: null,
    int_name: null,
    prop: null,
    age: null,
    interval: null,
  };
}

/** The next free surface id: `d1`, `d2`, … */
export function nextSurfaceID(surfaces: DraftSurfaces): string {
  let max = 0;
  for (const id of surfaces.keys()) {
    const n = parseInt(id.slice(1));
    if (!isNaN(n) && n > max) max = n;
  }
  return `d${max + 1}`;
}

/* -------------------------------------------------- working coordinates */

/** Where each surface sits, and whether that is its constraint or a guess.
 * `order` runs top first; `positionAxis` is set on a measured column. */
export interface WorkingCoordinate {
  value: number;
  /** Not the surface's own value: interpolated, or an interval's middle */
  speculative: boolean;
  /** Placed by something the surface says (a value, or an interval) rather
   * than by its neighbours alone */
  anchored: boolean;
}

export function workingCoordinates(
  order: string[],
  surfaces: DraftSurfaces,
  positionAxis: ColumnAxisType | null
): Map<string, WorkingCoordinate> {
  // Work in a coordinate that grows downwards — age, depth, or negated height
  // — so one interpolation serves every column.
  let sign = 1;
  if (positionAxis === ColumnAxisType.HEIGHT) sign = -1;
  const known = order.map((id) => {
    const value = anchorValue(surfaces.get(id), positionAxis);
    if (value == null) return null;
    return value * sign;
  });

  const values = fillGaps(known);
  const out = new Map<string, WorkingCoordinate>();
  order.forEach((id, i) => {
    let value = values[i] * sign;
    // Unconstrained throughout: count up from the base of a height column,
    // down from the top of anything else, so no position is negative
    if (known.every((d) => d == null) && sign === -1) {
      value = order.length - 1 - i;
    }
    const exact = constraintValue(surfaces.get(id), positionAxis);
    out.set(id, {
      value,
      speculative: exact == null,
      anchored: known[i] != null,
    });
  });
  return out;
}

/** What places a surface: its exact value, or on an age column the middle of
 * the interval it has been given without a proportion. */
function anchorValue(
  surface: DraftSurface | null | undefined,
  positionAxis: ColumnAxisType | null
): number | null {
  const exact = constraintValue(surface, positionAxis);
  if (exact != null || positionAxis != null) return exact;
  const interval = surface?.interval;
  if (interval == null) return null;
  return (interval.b_age + interval.t_age) / 2;
}

/** The value a surface is constrained to on the column's index. */
export function constraintValue(
  surface: DraftSurface | null | undefined,
  positionAxis: ColumnAxisType | null
): number | null {
  if (surface == null) return null;
  if (positionAxis != null) return surface.pos;
  return surface.age;
}

/** Fill the nulls of a downward-growing sequence: evenly between known
 * neighbours, at the average known spacing beyond them, and one apart with
 * nothing known. */
function fillGaps(known: (number | null)[]): number[] {
  const indices = known
    .map((v, i) => (v == null ? null : i))
    .filter((i): i is number => i != null);
  if (indices.length === 0) return known.map((_, i) => i);

  const first = indices[0];
  const last = indices[indices.length - 1];
  let step = 1;
  if (last > first) step = ((known[last] as number) - (known[first] as number)) / (last - first);
  if (!(step > 0)) step = 1;

  return known.map((value, i) => {
    if (value != null) return value;
    if (i < first) return (known[first] as number) - (first - i) * step;
    if (i > last) return (known[last] as number) + (i - last) * step;
    let above = i;
    while (known[above] == null) above -= 1;
    let below = i;
    while (known[below] == null) below += 1;
    const a = known[above] as number;
    const b = known[below] as number;
    return a + ((b - a) * (i - above)) / (below - above);
  });
}

/* ---------------------------------------------------------- units */

/** A unit's boundary fields as its surfaces constrain them — blank where a
 * surface is unconstrained. What the sheets show and what is exported. */
export function resolveDraftUnit(
  unit: DraftUnit,
  surfaces: DraftSurfaces
): DraftUnit {
  return {
    ...unit,
    ...sideFields("top", surfaces.get(unit.t_surface ?? "")),
    ...sideFields("bottom", surfaces.get(unit.b_surface ?? "")),
  };
}

/** A unit placed on its surfaces' working coordinates, for drawing: every
 * unit with both surfaces has somewhere to be. */
export function placeDraftUnit(
  unit: DraftUnit,
  coords: Map<string, WorkingCoordinate>,
  positionAxis: ColumnAxisType | null
): DraftUnit | null {
  const top = coords.get(unit.t_surface ?? "");
  const bottom = coords.get(unit.b_surface ?? "");
  if (top == null || bottom == null) return null;
  if (positionAxis != null) {
    return { ...unit, t_pos: top.value, b_pos: bottom.value };
  }
  return { ...unit, t_age: top.value, b_age: bottom.value };
}

function sideFields(
  side: BoundarySide,
  surface: DraftSurface | null | undefined
): Partial<UnitLong> {
  const p = side === "top" ? "t" : "b";
  return {
    [`${p}_pos`]: surface?.pos ?? null,
    [`${p}_age`]: surface?.age ?? null,
    [`${p}_int_id`]: surface?.int_id ?? null,
    [`${p}_int_name`]: surface?.int_name ?? null,
    [`${p}_prop`]: surface?.prop ?? null,
  } as Partial<UnitLong>;
}

/* ---------------------------------------------------------- projection */

/** The surfaces of a new column as the editor's surface records, in order,
 * top first: placed at their working coordinates, `modeled` where that is a
 * guess, with the units each one separates. */
export function draftEditorSurfaces(
  order: string[],
  surfaces: DraftSurfaces,
  units: DraftUnit[],
  coords: Map<string, WorkingCoordinate>,
  positionAxis: ColumnAxisType | null
): EditorSurface[] {
  return order.map((id) => {
    const surface = surfaces.get(id) ?? blankSurface(id);
    const coord = coords.get(id);
    let calibration: SurfaceCalibration | null = null;
    if (surface.int_id != null && surface.interval != null) {
      calibration = {
        id: surface.int_id,
        name: surface.int_name ?? "",
        b_age: surface.interval.b_age,
        t_age: surface.interval.t_age,
      } as SurfaceCalibration;
    }
    let age = surface.age ?? NaN;
    let position = surface.pos;
    if (positionAxis == null) age = coord?.value ?? age;
    if (positionAxis != null) position = coord?.value ?? position;
    let status = "relative";
    if (coord?.speculative ?? true) status = "modeled";
    return {
      id,
      age,
      position,
      status,
      type: "",
      calibration,
      proportion: surface.prop,
      unitsAbove: units
        .filter((u) => u.b_surface === id)
        .map((u) => u.unit_id),
      unitsBelow: units
        .filter((u) => u.t_surface === id)
        .map((u) => u.unit_id),
      section_id: null,
    } as EditorSurface;
  });
}

/* ---------------------------------------------------------- filling */

/** Adjacent surfaces with no unit between them, top first: where *Fill
 * units* puts one. A pair is spanned when a unit's top is the upper surface
 * or above it and its base is the lower one or below it. */
export function unfilledGaps(
  order: string[],
  units: DraftUnit[]
): [string, string][] {
  const index = new Map(order.map((id, i) => [id, i]));
  const gaps: [string, string][] = [];
  for (let i = 0; i < order.length - 1; i++) {
    const spanned = units.some((u) => {
      const top = index.get(u.t_surface ?? "");
      const bottom = index.get(u.b_surface ?? "");
      if (top == null || bottom == null) return false;
      return top <= i && bottom >= i + 1;
    });
    if (!spanned) gaps.push([order[i], order[i + 1]]);
  }
  return gaps;
}
