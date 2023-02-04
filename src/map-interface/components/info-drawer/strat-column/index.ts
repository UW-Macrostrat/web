import { hyperStyled } from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import { preprocessUnits, Column } from "@macrostrat/column-views";
import {UnitLong} from "@macrostrat/api-types"
import "@macrostrat/column-components/main.module.styl";

import styles from "./strat-column.module.styl";
const h = hyperStyled(styles);

function ColumnOverlay({ col_id, units }: { col_id: number, units: UnitLong[] }) {
  if (units == null) return null;

  console.log(units);
  const unitsA = preprocessUnits(units);

  return h("div.column-overlay", [
    h(Column, {
      data: unitsA,
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

export function StratColumn({ col_id , units}) {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(ColumnOverlay, { col_id, units })
  );
}
