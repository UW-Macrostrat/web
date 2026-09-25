/** How the sheets draw a value, apart from what it is. Shared by the sheets
 * and the details pane's row editor so a modeled age or a restated attribute
 * reads the same in both. A *derived* value is the column spec's own role
 * (`ColumnSpec.derived`), which `@macrostrat/data-sheet` draws itself. */
import hyper from "@macrostrat/hyper";
import type { CellRenderContext } from "@macrostrat/data-sheet";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function formatAge(value: unknown): string {
  const age = Number(value);
  if (value == null || value === "" || isNaN(age)) return "";
  if (age >= 100) return age.toFixed(1);
  return age.toFixed(2);
}

type ValueRenderer = (value: any, ctx?: CellRenderContext) => any;

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
