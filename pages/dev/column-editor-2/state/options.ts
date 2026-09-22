/** The editor's settings: how the column is drawn, and how an edit behaves.
 *
 * Display options are view state and live in the URL where they are worth
 * sharing; the editing options change what an edit *does*, so they stay in the
 * page. The controls that set them are in `../settings-panel`.
 */
import { atom, type PrimitiveAtom } from "jotai";
import { ColumnAxisType } from "@macrostrat/column-components";
import { atomWithSearchParam } from "~/_utils/url-atoms";
import {
  columnScaleOptions,
  DEFAULT_UNCONFORMITY_COLLAPSE,
  inferPositionAxis,
  isHeightScaleMode,
  isUnconformityCollapse,
  type ColumnScaleOptions,
  type HeightScaleMode,
  type UnconformityCollapse,
} from "../scale";
import type { BoundaryKind } from "../boundaries";
import { overlappingUnitIDs, unitIssues } from "../validation";
import { baseUnitsAtom, editedUnitsAtom, snapshotAtom } from "./column";

/* --------------------------------------------------------- height scale */

const axisParamAtom = atomWithSearchParam("axis");

/** What the user asked for, if anything. */
const heightScaleChoiceAtom = atom(
  (get): HeightScaleMode | null => {
    const raw = get(axisParamAtom);
    if (isHeightScaleMode(raw)) return raw;
    return null;
  },
  (get, set, mode: HeightScaleMode | null) => {
    let value: string | null = mode;
    if (mode === get(defaultHeightScaleAtom)) value = null;
    set(axisParamAtom, value);
  }
);

/** The position axis this column's units support, if any. */
export const positionAxisAtom = atom<ColumnAxisType | null>((get) =>
  inferPositionAxis(get(baseUnitsAtom))
);

/** A measured column opens on its own index. `col_type == "section"` is how
 * Macrostrat marks the columns that were measured rather than compiled — the
 * eODP holes among them — and reading one by age hides the measurement. */
const defaultHeightScaleAtom = atom<HeightScaleMode>((get) => {
  const isSection = get(snapshotAtom)?.columnInfo?.col_type === "section";
  if (isSection && get(positionAxisAtom) != null) return "position";
  return "age";
});

/** The mode in force: what was asked for, else the column's default, falling
 * back to age when positions were asked for but aren't there. */
export const heightScaleModeAtom = atom(
  (get): HeightScaleMode => {
    const mode = get(heightScaleChoiceAtom) ?? get(defaultHeightScaleAtom);
    if (mode === "position" && get(positionAxisAtom) == null) return "age";
    return mode;
  },
  (get, set, mode: HeightScaleMode) => {
    set(heightScaleChoiceAtom, mode);
  }
);

/** The mode as `Column` takes it. */
export const columnScaleOptionsAtom = atom<ColumnScaleOptions>((get) =>
  columnScaleOptions(get(heightScaleModeAtom), get(positionAxisAtom))
);

/** The axis surfaces are built, ordered and edited on. */
export const surfaceAxisTypeAtom = atom((get) => {
  const { axisType, isPositionAxis } = get(columnScaleOptionsAtom);
  if (isPositionAxis) return axisType;
  return ColumnAxisType.AGE;
});

/** Which index the editor judges boundaries and overlaps on: the measured
 * position for a measured column, the age model otherwise. */
export const boundaryKindAtom = atom<BoundaryKind>((get) => {
  if (get(columnScaleOptionsAtom).isPositionAxis) return "position";
  return "chrono";
});

/* ------------------------------------------------------ unconformities */

const unconformityParamAtom = atomWithSearchParam("unconf");

/** How much of the section structure is drawn as unconformity markers.
 * Synced to `?unconf=`, the default kept out. */
export const unconformityCollapseAtom = atom(
  (get): UnconformityCollapse => {
    const raw = get(unconformityParamAtom);
    if (isUnconformityCollapse(raw)) return raw;
    return DEFAULT_UNCONFORMITY_COLLAPSE;
  },
  (get, set, mode: UnconformityCollapse) => {
    let value: string | null = mode;
    if (mode === DEFAULT_UNCONFORMITY_COLLAPSE) value = null;
    set(unconformityParamAtom, value);
  }
);

/* ------------------------------------------------- other display options */

/** A number in the URL, cleared by writing `null`. */
function numericSearchParamAtom(key: string) {
  const param = atomWithSearchParam(key);
  return atom(
    (get): number | null => {
      const raw = get(param);
      if (raw == null) return null;
      const value = parseFloat(raw);
      if (isNaN(value)) return null;
      return value;
    },
    (get, set, value: number | null) => {
      let next: string | null = null;
      if (value != null && !isNaN(value)) next = String(value);
      set(param, next);
    }
  );
}

/** Pixels per Myr, per metre, or per surface, depending on the mode. Unset
 * means the column sizes itself from `targetUnitHeight`. */
export const pixelScaleAtom = numericSearchParamAtom("scale");

export const DEFAULT_UNIT_HEIGHT = 24;

/** Room for a typical unit, in pixels — the knob that draws the column larger
 * or smaller when no fixed scale is set. `null` restores the default. */
export const targetUnitHeightAtom: PrimitiveAtom<number | null> = atom<
  number | null
>(DEFAULT_UNIT_HEIGHT);

export const showTimescaleAtom: PrimitiveAtom<boolean> = atom(true);

/** Which timescales are drawn beside the column in surfaces mode.
 *
 * - `ics` — the international timescale alone, as everywhere else.
 * - `selection` — and the timescale(s) the selected surface's calibration
 *   interval belongs to, so you can see what it was referred to.
 * - `all` — and every timescale any of this column's surfaces reference.
 */
export type ShownTimescales = "ics" | "selection" | "all";

export const shownTimescalesAtom: PrimitiveAtom<ShownTimescales> =
  atom<ShownTimescales>("ics");

/** Whether the surfaces overlay is drawn in units mode. In surfaces mode the
 * lines are the edit targets, so they are always drawn. */
export const showSurfaceLinesAtom: PrimitiveAtom<boolean> = atom(true);

/* ----------------------------------------------------- editing options */

/** Whether a boundary edit carries the units that shared it.
 *
 * On (the default) a boundary is a surface: moving it moves everything hung on
 * it. Off is the ingestion spreadsheet's own behaviour — the row's value
 * changes and its neighbours don't, which is the only way to say that two
 * units no longer meet. */
export const preserveSurfacesAtom: PrimitiveAtom<boolean> = atom(true);

const allowOverlapsChoiceAtom: PrimitiveAtom<boolean> = atom(false);

/** True when the column arrived with overlapping units. Overlap is a real
 * relationship — units that interfinger or pinch out — not only a mistake, so
 * a column that already has it can't have it forbidden. */
export const overlapsLockedAtom = atom((get) => {
  const units = get(baseUnitsAtom);
  return overlappingUnitIDs(units, get(boundaryKindAtom)).size > 0;
});

export const allowOverlappingUnitsAtom = atom(
  (get) => get(overlapsLockedAtom) || get(allowOverlapsChoiceAtom),
  (get, set, value: boolean) => {
    set(allowOverlapsChoiceAtom, value);
  }
);

/** Everything wrong with the transaction as it stands. Read by the sheets'
 * cell validators and by the header, so both say the same thing. */
export const unitIssuesAtom = atom((get) =>
  unitIssues(
    get(editedUnitsAtom),
    get(boundaryKindAtom),
    get(allowOverlappingUnitsAtom)
  )
);

/** Blocking problems only — what stops a transaction being exported. */
export const blockingIssuesAtom = atom((get) =>
  get(unitIssuesAtom).filter((d) => d.severity === "error")
);
