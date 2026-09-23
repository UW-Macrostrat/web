/** Controlled editors for the fields that must name a Macrostrat entity:
 * lithologies, environments, and the interval a boundary is calibrated to.
 *
 * Each is a `cellDetail` surface for `@macrostrat/data-sheet` — an editor
 * when the cell is writable and the plain value otherwise — so the same
 * component serves the sheet's popover and the details pane's row editor,
 * and a value is entered by picking from the vocabulary rather than typing a
 * string that may match nothing.
 *
 * **Cross-repo note.** These stand in for `LithologyPicker`,
 * `EnvironmentPicker` and `IntervalPositionEditor` in
 * `@macrostrat/data-components`, which `web` can't import until that package
 * is released. They keep the same value contracts (the unit's own `lith` /
 * `environ` arrays; `{ int_id, int_name, prop }` for a position), so the swap
 * is an import change.
 */
import hyper from "@macrostrat/hyper";
import { useMemo } from "react";
import { MenuItem, Slider } from "@blueprintjs/core";
import { type ItemRenderer, MultiSelect, Suggest } from "@blueprintjs/select";
import type { CellDetailContext } from "@macrostrat/data-sheet";
import { useMacrostratDefs } from "@macrostrat/data-provider";
import {
  IntervalTag,
  LithologyTag,
  LithologyTagFeature,
  TagSize,
} from "@macrostrat/data-components";
import { ageForProportion, type IntervalDef } from "./boundaries";
import { renderLithology, renderNames } from "./render";
import { useIntervalDefs } from "./state";
import styles from "./main.module.sass";
import "@blueprintjs/select/lib/css/blueprint-select.css";

const h = hyper.styled(styles);

/* -------------------------------------------------------------- vocabularies */

interface VocabularyItem {
  id: number;
  name: string;
  color?: string;
  description?: string;
}

const renderVocabularyItem: ItemRenderer<VocabularyItem> = (
  item,
  { handleClick, handleFocus, modifiers }
) => {
  if (!modifiers.matchesPredicate) return null;
  return h(MenuItem, {
    key: item.id,
    text: item.name,
    label: item.description,
    active: modifiers.active,
    disabled: modifiers.disabled,
    onClick: handleClick,
    onFocus: handleFocus,
    roleStructure: "listoption",
    shouldDismissPopover: false,
  });
};

function matchesQuery(query: string, item: VocabularyItem): boolean {
  return item.name.toLowerCase().includes(query.trim().toLowerCase());
}

/** A multi-valued pick from a vocabulary, drawn as the entity's own tags. */
function VocabularyPicker<T extends { name: string }>({
  items,
  value,
  onChange,
  toItem,
  fromItem,
  renderTag,
  placeholder,
}: {
  items: VocabularyItem[];
  value: T[];
  onChange: (value: T[]) => void;
  toItem: (entry: T) => VocabularyItem;
  fromItem: (item: VocabularyItem) => T;
  renderTag: (entry: T) => any;
  placeholder: string;
}) {
  const selected = useMemo(() => value.map(toItem), [value, toItem]);
  const selectedIDs = new Set(selected.map((d) => d.id));

  return h(MultiSelect<VocabularyItem>, {
    className: "vocabulary-picker",
    items,
    selectedItems: selected,
    itemsEqual: "id",
    itemRenderer: renderVocabularyItem,
    itemPredicate: matchesQuery,
    tagRenderer: (item) => {
      const entry = value.find((d) => toItem(d).id === item.id);
      if (entry == null) return item.name;
      return renderTag(entry);
    },
    onItemSelect: (item) => {
      if (selectedIDs.has(item.id)) {
        onChange(value.filter((d) => toItem(d).id !== item.id));
        return;
      }
      onChange([...value, fromItem(item)]);
    },
    onRemove: (item) => onChange(value.filter((d) => toItem(d).id !== item.id)),
    placeholder,
    resetOnSelect: true,
    fill: true,
    popoverProps: { minimal: true, matchTargetWidth: true },
    noResults: h(MenuItem, {
      disabled: true,
      text: "No matches",
      roleStructure: "listoption",
    }),
  });
}

/* ---------------------------------------------------------------- lithology */

const lithologyFeatures = new Set([
  LithologyTagFeature.Proportion,
  LithologyTagFeature.Attributes,
]);

/** The unit's lithologies: `LithologyTag`s when read-only, a picker over the
 * lithology definitions when writable. Proportions and attributes on an
 * existing entry are kept; a newly picked lithology starts without either. */
export function LithologyCellDetail(ctx: CellDetailContext) {
  return h(LithologyCellEditor, { ctx });
}

function LithologyCellEditor({ ctx }: { ctx: CellDetailContext }) {
  const defs = useMacrostratDefs("lithologies");
  const items = useMemo(() => definitionItems(defs, "lith_id"), [defs]);
  const value: any[] = ctx.value ?? [];

  if (!ctx.editable) {
    return h("span", renderLithology(value));
  }

  return h("div.cell-editor-popover", [
    h(VocabularyPicker<any>, {
      items,
      value,
      onChange: ctx.onChange,
      toItem: (lith) => ({ id: lith.lith_id, name: lith.name }),
      fromItem: (item) => ({
        lith_id: item.id,
        name: item.name,
        prop: null,
        atts: [],
      }),
      renderTag: (lith) =>
        h(LithologyTag, {
          data: { ...(defs?.get(lith.lith_id) ?? {}), ...lith },
          features: lithologyFeatures,
          size: TagSize.Small,
          interactive: false,
        }),
      placeholder: "Add a lithology…",
    }),
    h(
      "p.cell-editor-hint",
      "Pick from Macrostrat's lithologies. Proportions and attributes are kept on the entries already here."
    ),
  ]);
}

/* -------------------------------------------------------------- environment */

export function EnvironmentCellDetail(ctx: CellDetailContext) {
  return h(EnvironmentCellEditor, { ctx });
}

function EnvironmentCellEditor({ ctx }: { ctx: CellDetailContext }) {
  const defs = useMacrostratDefs("environments");
  const items = useMemo(() => definitionItems(defs, "environ_id"), [defs]);
  const value: any[] = ctx.value ?? [];

  if (!ctx.editable) {
    return h("span", renderNames(value));
  }

  return h("div.cell-editor-popover", [
    h(VocabularyPicker<any>, {
      items,
      value,
      onChange: ctx.onChange,
      toItem: (env) => ({ id: env.environ_id, name: env.name }),
      fromItem: (item) => {
        const def = defs?.get(item.id) ?? {};
        return {
          environ_id: item.id,
          name: item.name,
          class: def.class,
          type: def.type,
        };
      },
      renderTag: (env) =>
        h(LithologyTag, {
          data: { ...(defs?.get(env.environ_id) ?? {}), ...env },
          size: TagSize.Small,
          interactive: false,
        }),
      placeholder: "Add an environment…",
    }),
  ]);
}

function definitionItems(
  defs: Map<number, any> | null,
  idField: string
): VocabularyItem[] {
  if (defs == null) return [];
  return Array.from(defs.values()).map((def) => ({
    id: def[idField],
    name: def.name,
    color: def.color,
    description: [def.class, def.type].filter(Boolean).join(" · "),
  }));
}

/* ----------------------------------------------------------------- intervals */

/** A boundary's chronostratigraphic position: the interval it is calibrated
 * to and the proportion within it, from which its age follows.
 *
 * The cell holds the interval's name (`b_int_name` / `t_int_name`); the
 * proportion is the row's `b_prop` / `t_prop`. Committing hands back
 * `{ int_id, int_name, prop }`, which `readBoundaryEdit` turns into the
 * unit's fields and the age they imply. */
export function intervalCellDetail(side: "top" | "bottom") {
  return (ctx: CellDetailContext) => h(IntervalCellEditor, { ctx, side });
}

const renderIntervalItem: ItemRenderer<IntervalDef> = (
  interval,
  { handleClick, handleFocus, modifiers }
) => {
  if (!modifiers.matchesPredicate) return null;
  return h(MenuItem, {
    key: interval.int_id,
    text: interval.name,
    label: `${formatAge(interval.b_age)}–${formatAge(interval.t_age)} Ma`,
    active: modifiers.active,
    onClick: handleClick,
    onFocus: handleFocus,
    roleStructure: "listoption",
  });
};

function IntervalCellEditor({
  ctx,
  side,
}: {
  ctx: CellDetailContext;
  side: "top" | "bottom";
}) {
  const intervals = useIntervalDefs();
  const prefix = side === "top" ? "t" : "b";
  const row = ctx.row ?? {};
  const int_id: number | null = row[`${prefix}_int_id`] ?? null;
  const prop: number | null = row[`${prefix}_prop`] ?? null;
  const current = int_id == null ? null : intervals?.get(int_id) ?? null;

  const items = useMemo(() => {
    if (intervals == null) return [];
    return Array.from(intervals.values()).sort((a, b) => b.b_age - a.b_age);
  }, [intervals]);

  const tag =
    current == null
      ? null
      : h(IntervalTag, {
          interval: {
            id: current.int_id,
            name: current.name,
            b_age: current.b_age,
            t_age: current.t_age,
            color: (current as any).color ?? "#888",
            rank: (current as any).lvl ?? 0,
          },
          size: TagSize.Small,
        });

  const age = ageForProportion(current, prop);
  let ageLabel = null;
  if (age != null) {
    ageLabel = h("span.derived-age", `${formatAge(age)} Ma`);
  }

  if (!ctx.editable) {
    return h("span", [tag ?? ctx.value ?? "", " ", ageLabel]);
  }

  const commit = (nextID: number | null, nextProp: number | null) => {
    if (nextID == null) return;
    const def = intervals?.get(nextID);
    ctx.onChange({
      int_id: nextID,
      int_name: def?.name ?? null,
      prop: nextProp,
    });
  };

  return h("div.cell-editor-popover.interval-cell-editor", [
    h(Suggest<IntervalDef>, {
      items,
      selectedItem: current,
      itemsEqual: "int_id",
      inputValueRenderer: (d) => d.name,
      itemRenderer: renderIntervalItem,
      itemPredicate: (query, d) =>
        d.name.toLowerCase().includes(query.trim().toLowerCase()),
      onItemSelect: (d) => commit(d.int_id, prop),
      inputProps: { placeholder: "Interval…", small: true },
      popoverProps: { minimal: true, matchTargetWidth: true },
      fill: true,
      resetOnClose: true,
      noResults: h(MenuItem, {
        disabled: true,
        text: "No matching interval",
        roleStructure: "listoption",
      }),
    }),
    h.if(current != null)(Slider, {
      min: 0,
      max: 1,
      stepSize: 0.01,
      labelStepSize: 0.5,
      labelRenderer: (v) => `${Math.round(v * 100)}%`,
      value: prop ?? 0,
      onRelease: (v) => commit(int_id, v),
      onChange: () => {},
    }),
    h("div", [tag, " ", ageLabel]),
    h(
      "p.cell-editor-hint",
      side === "bottom"
        ? "Where the base sits: an interval and a position in it (0 at the interval's base, 1 at its top)."
        : "Where the top sits: an interval and a position in it (0 at the interval's base, 1 at its top)."
    ),
  ]);
}

function formatAge(age: number): string {
  if (age >= 100) return age.toFixed(0);
  if (age >= 10) return age.toFixed(1);
  return age.toFixed(2);
}
