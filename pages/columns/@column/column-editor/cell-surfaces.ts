/** The cell surfaces for the fields that name a Macrostrat entity: the
 * lithology, environment and interval pickers of `@macrostrat/data-components`
 * wired to a sheet's cell — as editors when the cell is writable, as the
 * plain tags otherwise — so the same surface serves the sheet's popover and
 * the details pane's row editor. The vocabularies come from the page's
 * `MacrostratDataProvider`.
 *
 * A unit's lithologies and environments are its own arrays, which the
 * pickers take as they are. Its boundary intervals are three unit fields
 * (`b_int_id`, `b_int_name`, `b_prop`); the interval editor reads them as one
 * position and hands one back, which `readBoundaryEdit` turns into the fields
 * and the age they imply.
 */
import h from "@macrostrat/hyper";
import type {
  CellDetailContext,
  CellRenderContext,
} from "@macrostrat/data-sheet";
import {
  EnvironmentPicker,
  type IntervalPosition,
  IntervalPositionEditor,
  LithologyPicker,
  macrostratProportionTerms,
} from "@macrostrat/data-components";
import type { BoundarySide } from "./boundaries";

/* ---------------------------------------------------------------- tags */

/** The unit's lithologies as tags, read-only, for the cell at rest. */
export function renderLithologyTags(value: any) {
  return h(LithologyPicker, { value: value ?? [] });
}

export function renderEnvironmentTags(value: any) {
  return h(EnvironmentPicker, { value: value ?? [] });
}

/** The lithology picker as a cell's surface: an editor when the cell is
 * writable, with the format's proportion terms as well as percentages. In
 * the grid's own popover a lithology's details stack in the picker's place;
 * in a form they open in a popover of their own. */
export function LithologyCellDetail(ctx: CellDetailContext) {
  return h(LithologyPicker, {
    ...tagListProps(ctx),
    proportions: { terms: macrostratProportionTerms },
    detailsMode: ctx.surface === "cell" ? "stack" : "popover",
  });
}

export function EnvironmentCellDetail(ctx: CellDetailContext) {
  return h(EnvironmentPicker, tagListProps(ctx));
}

/** A tag-list picker's value: one cell's list, or — over several rows —
 * each row's, changed row by row. */
function tagListProps(ctx: CellDetailContext) {
  if (ctx.cells != null) {
    let onChangeValues: ((values: any[][]) => void) | undefined;
    if (ctx.editable) onChangeValues = ctx.onChangeCells;
    return {
      value: null,
      values: ctx.cells.map((c) => c.value ?? []),
      onChangeValues,
    };
  }
  return { value: ctx.value ?? [], onChange: editableChange(ctx) };
}

/** A surface edits only when the cell does; otherwise it is a viewer. */
function editableChange(ctx: CellDetailContext) {
  if (!ctx.editable) return undefined;
  return (value: any) => ctx.onChange(value);
}

/* ------------------------------------------------------------- intervals */

/** A boundary's position in time, read off the unit's own fields. */
export function boundaryPosition(
  row: any,
  side: BoundarySide
): IntervalPosition {
  const prefix = side === "top" ? "t" : "b";
  return {
    int_id: row?.[`${prefix}_int_id`] ?? null,
    int_name: row?.[`${prefix}_int_name`] ?? null,
    prop: row?.[`${prefix}_prop`] ?? null,
  };
}

/** The interval cell at rest: the interval's tag with its position in the
 * prefix, without the age (the age columns say that). */
export function renderBoundaryPosition(side: BoundarySide) {
  return (_value: any, ctx?: CellRenderContext) =>
    h(IntervalPositionEditor, {
      value: boundaryPosition(ctx?.row, side),
      showAge: false,
    });
}

/** The interval editor as a cell's surface. A position added to a base
 * starts at the interval's base (0), to a top at its top (1). Over several
 * rows the cells are edited one at a time — a position is one unit's. */
export function intervalCellDetail(side: BoundarySide) {
  const defaultProportion = side === "top" ? 1 : 0;
  return (ctx: CellDetailContext) =>
    h(IntervalPositionEditor, {
      value: boundaryPosition(ctx.row, side),
      onChange: editableChange(ctx),
      defaultProportion,
      timescaleChoice: true,
    });
}
