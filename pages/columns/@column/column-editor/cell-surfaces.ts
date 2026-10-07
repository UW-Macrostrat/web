/** The cell surfaces for the fields that name a Macrostrat entity: the
 * lithology, environment and interval pickers of `@macrostrat/data-components`
 * wired to a sheet's cell — as editors when the cell is writable, as the
 * plain tags otherwise — so the same surface serves the sheet's popover and
 * the details pane's row editor. The vocabularies come from the page's
 * `MacrostratDataProvider`.
 *
 * At rest in a cell, each picker is handed the cell's width (`layoutWidth`,
 * from the render context), so its one line of tags re-fits when the column
 * is resized instead of watching its own size.
 *
 * A unit's lithologies and environments are its own arrays, which the
 * pickers take as they are. Its boundary intervals are three unit fields
 * (`b_int_id`, `b_int_name`, `b_prop`); the interval editor reads them as one
 * position and hands one back, which `readBoundaryEdit` turns into the fields
 * and the age they imply.
 */
import h from "@macrostrat/hyper";
import { faciesIndexAtom, type FaciesIndex } from "./state/ingest";
import { useAtomValue } from "./state/ctx";
import { useMemo } from "react";
import { atom, useAtom } from "jotai";
import { HTMLSelect, InputGroup, SegmentedControl } from "@blueprintjs/core";
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
  useVocabularyIndex,
} from "@macrostrat/data-components";
import { nameIndex, type NameIndex } from "./plain-values";
import { type Choice, choiceLabel } from "./choices";
import type { BoundarySide } from "./boundaries";

/* ---------------------------------------------------------------- tags */

/** The unit's lithologies as tags, read-only, for the cell at rest. */
export function renderLithologyTags(value: any, ctx?: CellRenderContext) {
  return h(LithologyPicker, { value: value ?? [], layoutWidth: ctx?.width });
}

export function renderEnvironmentTags(value: any, ctx?: CellRenderContext) {
  return h(EnvironmentPicker, { value: value ?? [], layoutWidth: ctx?.width });
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
      layoutWidth: ctx?.width,
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

/* ------------------------------------------------------------- surfaces */

/** A surface's calibration as an interval position: its interval and its
 * proportion within it. */
function surfacePosition(row: any): IntervalPosition {
  return {
    int_id: row?.calibration?.id ?? null,
    int_name: row?.calibration?.name ?? null,
    prop: row?.proportion ?? null,
  };
}

/** The calibration cell at rest: the interval's tag, the position in it. */
export function renderSurfaceCalibration(
  _value: any,
  ctx?: CellRenderContext
) {
  return h(IntervalPositionEditor, {
    value: surfacePosition(ctx?.row),
    showAge: false,
    layoutWidth: ctx?.width,
  });
}

/** Constraining a new column's surface: the interval editor over its
 * calibration. */
export function SurfaceCalibrationDetail(ctx: CellDetailContext) {
  return h(IntervalPositionEditor, {
    value: surfacePosition(ctx.row),
    onChange: editableChange(ctx),
    timescaleChoice: true,
  });
}

/* ---------------------------------------------------------- plain text */

/** The vocabularies a typed lithology or environment is read against. */
export interface PlainVocabularies {
  lithologies: NameIndex<any>;
  lithAttributes: Set<string>;
  environments: NameIndex<any>;
  /** The dataset's own facies scheme, by id and name. */
  facies: FaciesIndex;
}

/** The shared vocabularies (the pickers' own indexes), by name. */
export function usePlainVocabularies(): PlainVocabularies {
  const lithologies = useVocabularyIndex<any>("lithologies", undefined).list;
  const lithAttributes = useVocabularyIndex<any>("lithAttributes", undefined).list;
  const environments = useVocabularyIndex<any>("environments", undefined).list;
  const facies = useAtomValue(faciesIndexAtom);
  return useMemo(
    () => ({
      lithologies: nameIndex(lithologies),
      lithAttributes: new Set(
        lithAttributes.map((d) => String(d.name ?? "").toLowerCase())
      ),
      environments: nameIndex(environments),
      facies,
    }),
    [lithologies, lithAttributes, environments, facies]
  );
}

/** A list field of the spreadsheet view in the row editor: the template's
 * text, committed on blur or Enter, read back by the sheet's edit path.
 *
 * Only until `@macrostrat/data-sheet` starts a form's text field from the
 * column's rendered text, as the grid's inline editor does
 * (UW-Macrostrat/web-components#270); drop it then. */
export function plainListField(format: (value: any) => string) {
  return (ctx: CellDetailContext) => h(PlainListInput, { ctx, format });
}

function PlainListInput({
  ctx,
  format,
}: {
  ctx: CellDetailContext;
  format: (value: any) => string;
}) {
  const shown = format(ctx.value);
  // What is being typed, until it is committed; `null` shows the value
  const draftAtom = useMemo(() => atom<string | null>(null), []);
  const [draft, setDraft] = useAtom(draftAtom);
  if (!ctx.editable) return shown;
  const commit = () => {
    if (draft != null && draft !== shown) ctx.onChange(draft);
    setDraft(null);
  };
  return h(InputGroup, {
    small: true,
    fill: true,
    value: draft ?? shown,
    onValueChange: setDraft,
    onBlur: commit,
    onKeyDown(evt) {
      if (evt.key === "Enter") commit();
      if (evt.key === "Escape") setDraft(null);
    },
  });
}

/* ------------------------------------------------------------- choices */

/** A closed choice as a cell's surface: the options side by side (a handful
 * of short ones, like a unit's status), or a drop-down (`select`). Read-only,
 * the chosen label. `fallback` is what an unset value reads as. */
export function choiceCellDetail(
  choices: Choice[],
  { select = false, fallback = null }: { select?: boolean; fallback?: string | null } = {}
) {
  return (ctx: CellDetailContext) => {
    const value = ctx.value ?? fallback;
    if (!ctx.editable) return choiceLabel(choices, value);
    if (select) {
      return h(HTMLSelect, {
        minimal: true,
        fill: true,
        value: value ?? "",
        options: [
          { label: "—", value: "" },
          ...choices.map((d) => ({ label: d.label, value: d.value })),
        ],
        onChange: (evt) => ctx.onChange(evt.currentTarget.value || null),
      });
    }
    return h(SegmentedControl, {
      small: true,
      options: choices.map((d) => ({ label: d.label, value: d.value })),
      value: value ?? undefined,
      onValueChange: (next: string) => ctx.onChange(next),
    });
  };
}

/** A closed choice at rest: its label. */
export function renderChoice(choices: Choice[]) {
  return (value: any) => choiceLabel(choices, value);
}
