import { compose, hyperStyled } from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import { preprocessUnits, Column } from "@macrostrat/column-views";
import "@macrostrat/column-components/main.module.styl";

import styles from "./main.module.styl";
const h = hyperStyled(styles);

function ColumnOverlay({ col_id }: { col_id: number }) {
  const data = useAPIResult(
    "https://macrostrat.org/api/v2/units",
    { col_id, all: true, response: "long" },
    (res) => res.success.data
  );
  if (data == null) return null;

  const units = preprocessUnits(data);

  return h("div.column-overlay", [
    h(Column, {
      data: units,
      showLabels: true,
      targetUnitHeight: 40,
      unconformityLabels: true,
      width: 280,
      columnWidth: 180,
    }),
  ]);
}

function resolvePattern(name: string | number) {
  return `//visualization-assets.s3.amazonaws.com/geologic-patterns/svg/${name}.svg`;
}

export function StratColumn({ col_id }) {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(ColumnOverlay, { col_id })
  );
}
