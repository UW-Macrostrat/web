/** What a cell's value *is*, beyond what it says — read by the sheets to draw
 * a record apart from a restatement, and a tie point apart from an
 * interpolation. Nothing here changes the data; it is all about how the
 * transaction is shown. */
import { atom } from "jotai";
import type { SurfaceStatus } from "@macrostrat/column-views";
import { filledRestatements, type RestatementKey } from "../filling";
import { editedUnitsAtom } from "./column";
import { dimFilledValuesAtom, positionAxisAtom } from "./options";
import { surfacesAtom } from "./surfaces";

/** The cells that repeat the unit before them in fill order (see
 * `../filling`). Empty when the setting is off, so the sheets have one thing
 * to read. */
export const filledRestatementsAtom = atom<Set<RestatementKey>>((get) => {
  if (!get(dimFilledValuesAtom)) return new Set();
  return filledRestatements(get(editedUnitsAtom), get(positionAxisAtom));
});

export interface UnitBoundaryStatuses {
  top: SurfaceStatus | null;
  bottom: SurfaceStatus | null;
}

/**
 * The age-model status of each unit's top and base, from the surfaces
 * projection: the surface a unit's top sits on is the one listing it below,
 * and the surface its base sits on lists it above.
 *
 * A `modeled` surface is an interpolation — its age falls out of the tie
 * points around it — so a unit's `b_age` or `t_age` on one is a modeled
 * value rather than a record, and the sheets draw it that way.
 */
export const unitBoundaryStatusAtom = atom<Map<number, UnitBoundaryStatuses>>(
  (get) => {
    const out = new Map<number, UnitBoundaryStatuses>();
    const entry = (unit_id: number) => {
      let value = out.get(unit_id);
      if (value == null) {
        value = { top: null, bottom: null };
        out.set(unit_id, value);
      }
      return value;
    };
    for (const surface of get(surfacesAtom)) {
      for (const id of surface.unitsBelow) entry(id).top = surface.status;
      for (const id of surface.unitsAbove) entry(id).bottom = surface.status;
    }
    return out;
  }
);

/** Whether an age is an interpolation rather than a calibrated value. */
export function isModeledStatus(status: SurfaceStatus | null | undefined) {
  return status === "modeled" || status === "derived";
}
