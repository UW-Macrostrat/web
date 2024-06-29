/** Correlation chart */
import { Column, preprocessUnits } from "@macrostrat/column-views";
import { runColumnQuery } from "~/pages/map/map-interface/app-state/handlers/fetch";
import { useAsyncEffect } from "use-async-effect";
import { useState } from "react";
import { PatternProvider } from "~/_providers";

import h from "./main.module.sass";

export interface ColumnIdentifier {
  col_id: number;
  col_name: string;
  project_id: number;
}

export function CorrelationChart({ columns }: { columns: ColumnIdentifier[] }) {
  return h(
    PatternProvider,
    h(
      "div.correlation-chart-inner",
      columns.map((col) => h(SingleColumn, { column: col, key: col.col_id }))
    )
  );
}

function SingleColumn({ column }: { column: ColumnIdentifier }) {
  const [unitData, setUnitData] = useState(null);

  useAsyncEffect(async () => {
    const data = await fetchUnitsForColumn(column.col_id);
    setUnitData(data);
  }, [column.col_id]);

  if (unitData == null) {
    return null;
  }

  return h("div.column", [
    h(Column, {
      data: unitData,
      showLabels: false,
      targetUnitHeight: 10,
      unconformityLabels: true,
      width: 100,
      columnWidth: 100,
    }),
  ]);
}

async function fetchUnitsForColumn(col_id: number) {
  const res = await runColumnQuery({ col_id }, null);
  return preprocessUnits(res);
}
