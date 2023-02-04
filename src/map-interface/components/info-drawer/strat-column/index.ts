import { hyperStyled } from "@macrostrat/hyper";
import { GeologicPatternProvider } from "@macrostrat/column-components";
import { preprocessUnits, Column } from "@macrostrat/column-views";
import {UnitLong} from "@macrostrat/api-types"
import "@macrostrat/column-components/main.module.styl";

import styles from "./strat-column.module.styl";
import { ColumnSummary } from "~/map-interface/app-state/handlers/columns";
const h = hyperStyled(styles);

function ColumnOverlay({ columnInfo }: { columnInfo: ColumnSummary | null }) {
  if (columnInfo == null) return null;
  const { col_id, units } = columnInfo;
  if (units == null) return null;

  const unitsA = preprocessUnits(units);

  return h("div.column-overlay.strat-column-container", [
    h("div.column-header.flex-row",[h("h3", columnInfo.col_name), h("div.spacer"), h("code",columnInfo.col_id)]),
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

export function StratColumn(props) {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(ColumnOverlay, props)
  );
}
