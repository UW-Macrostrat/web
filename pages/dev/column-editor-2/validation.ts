/** Whether the edited column holds together — pure, so the same rules answer
 * a cell's `validate` in the sheet and the editor's own blocking-error count.
 *
 * Nothing here rejects an edit. A boundary that reads backwards or a unit that
 * has come to overlap its neighbour is *recorded* and flagged; correcting it is
 * the next edit, not a refusal of this one. That is what makes the sheet's
 * green-and-red overlay the whole story about a transaction.
 */
import type { UnitLong } from "@macrostrat/api-types";
import type { CellValidation } from "@macrostrat/data-sheet";
import { positionValue } from "./scale";
import type { BoundaryKind } from "./boundaries";
import { boundaryTolerance, unitBoundary } from "./boundaries";

export function validateNumber(value: any): CellValidation | null {
  if (value == null || value === "") return null;
  if (isNaN(Number(value))) {
    return { severity: "error", message: "Not a number" };
  }
  return null;
}

export function validateAge(value: any): CellValidation | null {
  const notANumber = validateNumber(value);
  if (notANumber != null) return notANumber;
  if (value == null || value === "") return null;
  if (Number(value) < 0) {
    return { severity: "error", message: "Ages are ≥ 0" };
  }
  return null;
}

export function validateProportion(value: any): CellValidation | null {
  const notANumber = validateNumber(value);
  if (notANumber != null) return notANumber;
  if (value == null || value === "") return null;
  const n = Number(value);
  if (n < 0 || n > 1) {
    return { severity: "error", message: "Proportions are 0–1" };
  }
  return null;
}

/* ------------------------------------------------------------- overlaps */

/** A unit's extent on one index, low value first, so height, depth and age
 * columns compare the same way. `null` when the unit has no extent there. */
export function unitRange(
  unit: UnitLong,
  kind: BoundaryKind
): [number, number] | null {
  const top = unitBoundary(unit, "top", kind);
  const bottom = unitBoundary(unit, "bottom", kind);
  if (top == null || bottom == null) return null;
  return [Math.min(top, bottom), Math.max(top, bottom)];
}

/** Do two units of the same section share more than a boundary? Units in
 * different sections are gap-bound packages and are never compared. */
export function unitsOverlap(
  a: UnitLong,
  b: UnitLong,
  kind: BoundaryKind
): boolean {
  if (a.section_id !== b.section_id) return false;
  const ra = unitRange(a, kind);
  const rb = unitRange(b, kind);
  if (ra == null || rb == null) return false;
  const shared = Math.min(ra[1], rb[1]) - Math.max(ra[0], rb[0]);
  return shared > boundaryTolerance(kind);
}

/** Every unit that overlaps another. */
export function overlappingUnitIDs(
  units: UnitLong[],
  kind: BoundaryKind
): Set<number> {
  const ids = new Set<number>();
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      if (!unitsOverlap(units[i], units[j], kind)) continue;
      ids.add(units[i].unit_id);
      ids.add(units[j].unit_id);
    }
  }
  return ids;
}

/* ------------------------------------------------- the transaction's state */

export interface UnitIssue {
  unit_id: number;
  /** The sheet column the issue is attached to */
  field: string;
  severity: "error" | "warning";
  message: string;
}

/** Which sheet columns a boundary problem is reported on, per index. */
const BOUNDARY_FIELDS: Record<BoundaryKind, [string, string]> = {
  position: ["b_pos", "t_pos"],
  chrono: ["b_age", "t_age"],
};

/** Everything wrong with the edited units: unreadable boundaries, and — when
 * overlap isn't allowed — units that have come to overlap. */
export function unitIssues(
  units: UnitLong[],
  kind: BoundaryKind,
  allowOverlaps: boolean
): UnitIssue[] {
  const issues: UnitIssue[] = [];
  const [bottomField, topField] = BOUNDARY_FIELDS[kind];

  for (const unit of units) {
    if (unitRange(unit, kind) != null) continue;
    // Only a measured column is expected to carry positions, so a missing one
    // is worth saying only where the column is drawn on that index.
    issues.push({
      unit_id: unit.unit_id,
      field: bottomField,
      severity: "warning",
      message: "This unit has no readable extent on the column's axis.",
    });
  }

  if (allowOverlaps) return issues;
  for (const unit_id of overlappingUnitIDs(units, kind)) {
    for (const field of [bottomField, topField]) {
      issues.push({
        unit_id,
        field,
        severity: "error",
        message: "This unit overlaps another in its section.",
      });
    }
  }
  return issues;
}

/** The issues on one unit's cell, as a `ColumnSpec.validate` answers. The
 * worst severity wins, so an overlap error outranks a warning. */
export function issueForCell(
  issues: UnitIssue[],
  unit_id: number,
  field: string
): CellValidation | null {
  let found: UnitIssue | null = null;
  for (const issue of issues) {
    if (issue.unit_id !== unit_id || issue.field !== field) continue;
    if (issue.severity === "error") return issue;
    found ??= issue;
  }
  if (found == null) return null;
  return { severity: found.severity, message: found.message };
}

/** Values that are equal as far as the transaction is concerned. The v2 API
 * hands positions back as strings (`"6.800"`) while an edit writes a number,
 * so a cell typed back to its loaded value must still read as unedited. */
export function sameFieldValue(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  const na = positionValue(a);
  const nb = positionValue(b);
  if (na != null && nb != null) return na === nb;
  return false;
}
