/** The column's height scale: what the modes are, and what each one means to
 * `Column`. Pure model — the atoms are in `./state`, the controls in
 * `./display`.
 *
 * The height scale is the one display choice that changes what the editor
 * *is*. Three modes, in two families:
 *
 * - **Age** and **equidistant surfaces** are age columns. Units are placed by
 *   `t_age`/`b_age`; the equidistant scale just re-maps age to pixels so every
 *   surface sits the same distance from the next, which is the only way to
 *   read a column whose units overlap heavily or whose ages crowd together.
 * - **Measured position** is a *different index*. Units are placed by
 *   `t_pos`/`b_pos` — metres, or metres below seafloor for the eODP columns —
 *   and so are the surfaces, which means an edit writes a position rather than
 *   an age. Only available for columns whose units carry positions.
 */
import type { UnitLong } from "@macrostrat/api-types";
import { ColumnAxisType } from "@macrostrat/column-components";
import {
  HybridScaleType,
  type HybridScaleDefinition,
} from "@macrostrat/column-views";

/** Not `ColumnAxisType` itself: two of these are age axes under a hybrid
 * scale, and height and depth are one choice to the user — which of the two a
 * column is follows from its units. */
export type HeightScaleMode = "age" | "position" | "equidistant-surfaces";

export const heightScaleOptions: { label: string; value: HeightScaleMode }[] = [
  { label: "Age", value: "age" },
  { label: "Measured position", value: "position" },
  { label: "Equidistant surfaces", value: "equidistant-surfaces" },
];

export const HEIGHT_SCALE_MODES = heightScaleOptions.map((d) => d.value);

export function isHeightScaleMode(value: unknown): value is HeightScaleMode {
  return HEIGHT_SCALE_MODES.includes(value as HeightScaleMode);
}

/** `t_pos`/`b_pos` arrive from the v2 API as strings (`"6.800"`). */
export function positionValue(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  if (typeof num !== "number" || isNaN(num)) return null;
  return num;
}

/** Height or depth, from the direction the units run: a column whose top sits
 * at a *larger* coordinate than its base is measured upwards from a datum
 * (height); one whose top is smaller is measured downwards (depth — the eODP
 * case, where `t_pos` is metres below seafloor). `null` when no unit carries a
 * usable pair, which is what makes the position mode unavailable. */
export function inferPositionAxis(
  units: UnitLong[] | null | undefined
): ColumnAxisType | null {
  for (const unit of units ?? []) {
    const t_pos = positionValue(unit.t_pos);
    const b_pos = positionValue(unit.b_pos);
    if (t_pos == null || b_pos == null || t_pos === b_pos) continue;
    if (t_pos > b_pos) return ColumnAxisType.HEIGHT;
    return ColumnAxisType.DEPTH;
  }
  return null;
}

export interface ColumnScaleOptions {
  axisType: ColumnAxisType;
  hybridScale: HybridScaleDefinition | null;
  /** True when units and surfaces are indexed by `t_pos`/`b_pos` rather than
   * by age — the editor edits positions then. */
  isPositionAxis: boolean;
}

/** A mode translated into what `Column` takes. */
export function columnScaleOptions(
  mode: HeightScaleMode,
  positionAxis: ColumnAxisType | null
): ColumnScaleOptions {
  if (mode === "position") {
    return {
      axisType: positionAxis ?? ColumnAxisType.HEIGHT,
      hybridScale: null,
      isPositionAxis: true,
    };
  }
  if (mode === "equidistant-surfaces") {
    return {
      axisType: ColumnAxisType.AGE,
      hybridScale: { type: HybridScaleType.EquidistantSurfaces },
      isPositionAxis: false,
    };
  }
  return {
    axisType: ColumnAxisType.AGE,
    hybridScale: null,
    isPositionAxis: false,
  };
}

/* ------------------------------------------------------- unconformities */

/** How much of the column's section structure is drawn as gaps.
 *
 * Sections are gap-bound packages, and the space between two of them is an
 * unconformity — drawn as a fixed-height marker rather than to scale, since
 * the time it stands for is usually far longer than the rock. Collapsing one
 * merges the packages into a continuous section, so the gap is drawn at the
 * column's own scale instead (which for a small gap is all but invisible).
 *
 * - `none` keeps every section apart: the formal representation, one marker
 *   per unconformity however slight.
 * - `small` (the default) collapses the gaps that would be drawn thinner than
 *   the unconformity marker itself, so the marker never claims more room than
 *   the gap deserves.
 * - `all` collapses every one: a single continuous column with the gaps to
 *   scale and no markers. */
export type UnconformityCollapse = "none" | "small" | "all";

export const unconformityCollapseOptions: {
  label: string;
  value: UnconformityCollapse;
}[] = [
  { label: "None", value: "none" },
  { label: "Small", value: "small" },
  { label: "All", value: "all" },
];

export const DEFAULT_UNCONFORMITY_COLLAPSE: UnconformityCollapse = "small";

export function isUnconformityCollapse(
  value: unknown
): value is UnconformityCollapse {
  return unconformityCollapseOptions.some((d) => d.value === value);
}

/** As `Column` takes it: `false` collapses nothing, `true` uses the library's
 * own pixel threshold, and a number is that threshold — so an infinite one
 * collapses every gap however wide. */
export function collapseUnconformities(
  mode: UnconformityCollapse
): boolean | number {
  if (mode === "none") return false;
  if (mode === "all") return Infinity;
  return true;
}

/** The unit fields an edit in this mode writes: a surface move sets the top
 * field on the units below it and the bottom field on the units above. */
export function boundaryFields(isPositionAxis: boolean): {
  top: "t_age" | "t_pos";
  bottom: "b_age" | "b_pos";
} {
  if (isPositionAxis) return { top: "t_pos", bottom: "b_pos" };
  return { top: "t_age", bottom: "b_age" };
}
