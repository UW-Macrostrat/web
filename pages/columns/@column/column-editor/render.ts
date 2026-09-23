/** How the sheets draw a value, apart from what it is. Shared by the sheets
 * and the details pane's row editor so a lithology, a derived age or a
 * restated attribute reads the same in both. */
import hyper from "@macrostrat/hyper";
import type { CellRenderContext } from "@macrostrat/data-sheet";
import type { UnitLong } from "@macrostrat/api-types";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function renderLithology(value: UnitLong["lith"]): string {
  if (value == null) return "";
  return value
    .map((d) => {
      let text = d.name;
      if (d.prop != null) text += ` (${Math.round(d.prop * 100)}%)`;
      return text;
    })
    .join("; ");
}

export function renderNames(
  value: { name: string }[] | null | undefined
): string {
  if (value == null) return "";
  return value.map((d) => d.name).join("; ");
}

export function formatAge(value: unknown): string {
  const age = Number(value);
  if (value == null || value === "" || isNaN(age)) return "";
  if (age >= 100) return age.toFixed(1);
  return age.toFixed(2);
}

type ValueRenderer = (value: any, ctx?: CellRenderContext) => any;

/** A derived value: computed from the record rather than typed, drawn dimmed
 * and italic. Mirrors `ColumnSpec.derived` in `@macrostrat/data-sheet`,
 * which `web` gets when that package is next released. */
export function derivedValue(render: ValueRenderer = (d) => d): ValueRenderer {
  return (value, ctx) => {
    const inner = render(value, ctx);
    if (inner == null || inner === "") return "";
    return h("span.derived-value", inner);
  };
}

/** A value that may be an interpolation of the age model rather than a tie
 * point: `isModeled(ctx)` says which, and a modeled one is drawn dimmed. */
export function modeledValue(
  render: ValueRenderer,
  isModeled: (ctx: CellRenderContext | undefined) => boolean
): ValueRenderer {
  return (value, ctx) => {
    const inner = render(value, ctx);
    if (inner == null || inner === "") return "";
    if (!isModeled(ctx)) return inner;
    return h(
      "span.modeled-value",
      { title: "Interpolated by the age model, not a calibrated tie point" },
      inner
    );
  };
}

/** An attribute that may restate the neighbouring unit's: `isRestated(ctx)`
 * says which, and a restatement is drawn dimmed behind an arrow towards the
 * unit it repeats (up for a height column, down for a depth column). */
export function filledValue(
  render: ValueRenderer,
  isRestated: (ctx: CellRenderContext | undefined) => "up" | "down" | null
): ValueRenderer {
  return (value, ctx) => {
    const inner = render(value, ctx);
    if (inner == null || inner === "") return "";
    const direction = isRestated(ctx);
    if (direction == null) return inner;
    const arrow = direction === "down" ? "↓" : "↑";
    return h(
      "span.filled-value",
      {
        title:
          "Repeats the neighbouring unit; the ingestion sheet fills this in",
      },
      [h("span.fill-arrow", arrow), inner]
    );
  };
}
