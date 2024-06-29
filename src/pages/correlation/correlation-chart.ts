/** Correlation chart */
import { preprocessUnits } from "@macrostrat/column-views";
import { runColumnQuery } from "~/pages/map/map-interface/app-state/handlers/fetch";
import { useAsyncEffect } from "use-async-effect";
import { useState, useEffect } from "react";
import { PatternProvider } from "~/_providers";
import { Column } from "./column";
import { UnitLong } from "@macrostrat/api-types";

import h from "./main.module.sass";

export interface ColumnIdentifier {
  col_id: number;
  col_name: string;
  project_id: number;
}

export function CorrelationChart({ columns }: { columns: ColumnIdentifier[] }) {
  const [unitData, setUnitData] = useState(null);

  useEffect(() => {
    const promises = columns.map((col) => fetchUnitsForColumn(col.col_id));
    Promise.all(promises).then((data) => setUnitData(data));
  }, [columns]);

  if (unitData == null) {
    return null;
  }

  console.log(columns, unitData);

  return h(
    PatternProvider,
    h(
      "div.correlation-chart-inner",
      unitData.map((units, i) => h(SingleColumn, { units: units, key: i }))
    )
  );
}

function SingleColumn({
  units,
}: {
  column: ColumnIdentifier;
  units: UnitLong[];
}) {
  return h("div.column", [
    h(Column, {
      data: units,
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
