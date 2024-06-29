/** Correlation chart */
import { preprocessUnits } from "@macrostrat/column-views";
import { runColumnQuery } from "~/pages/map/map-interface/app-state/handlers/fetch";
import { useAsyncEffect } from "use-async-effect";
import { useState, useEffect } from "react";
import { PatternProvider } from "~/_providers";
import { Column, TimescaleColumn } from "./column";
import { UnitLong } from "@macrostrat/api-types";

import h from "./main.module.sass";

export interface ColumnIdentifier {
  col_id: number;
  col_name: string;
  project_id: number;
}

export interface CorrelationChartData {
  t_age: number;
  b_age: number;
  units: UnitLong[][]; // Units for each column
}

export function CorrelationChart({ columns }: { columns: ColumnIdentifier[] }) {
  const [chartData, setChartData] = useState<CorrelationChartData | null>(null);

  useEffect(() => {
    const promises = columns.map((col) => fetchUnitsForColumn(col.col_id));
    Promise.all(promises).then((data) =>
      setChartData(preprocessChartData(data))
    );
  }, [columns]);

  if (chartData == null) {
    return null;
  }

  const targetUnitHeight = 20;

  const { t_age, b_age } = chartData;
  const range = [b_age, t_age];

  const dAge = b_age - t_age;
  const maxNUnits = Math.max(...chartData.units.map((d) => d.length));
  const targetHeight = targetUnitHeight * maxNUnits;
  const pixelScale = Math.ceil(targetHeight / dAge);

  const firstColumn = chartData.units.slice(0, 1);

  console.log(firstColumn);

  return h(
    PatternProvider,
    h("div.correlation-chart-inner", [
      h(
        firstColumn.map((units, i) =>
          h(TimescaleColumnExt, {
            units: units,
            range,
            pixelScale,
            key: i,
          })
        )
      ),
      h(
        chartData.units.map((units, i) =>
          h(SingleColumn, {
            units: units,
            range,
            pixelScale,
            key: i,
          })
        )
      ),
    ])
  );
}

function TimescaleColumnExt({
  units,
  range,
  pixelScale,
}: {
  column: ColumnIdentifier;
  units: UnitLong[];
  range: [number, number];
  pixelScale: number;
}) {
  return h("div.column", [
    h(TimescaleColumn, {
      data: units,
      showLabels: false,
      unconformityLabels: true,
      width: 100,
      columnWidth: 100,
      range,
      pixelScale,
    }),
  ]);
}

function SingleColumn({
  units,
  range,
  pixelScale,
}: {
  column: ColumnIdentifier;
  units: UnitLong[];
  range: [number, number];
  pixelScale: number;
}) {
  return h("div.column", [
    h(Column, {
      data: units,
      showLabels: false,
      unconformityLabels: true,
      width: 100,
      columnWidth: 100,
      range,
      pixelScale,
    }),
  ]);
}

async function fetchUnitsForColumn(col_id: number) {
  const res = await runColumnQuery({ col_id }, null);
  return preprocessUnits(res);
}

function preprocessChartData(units: UnitLong[][]): CorrelationChartData {
  const [b_age, t_age] = findEncompassingScaleBounds(units.flat());
  return { units, b_age, t_age };
}

function findEncompassingScaleBounds(units: UnitLong[]) {
  const b_age = Math.max(...units.map((d) => d.b_age));
  const t_age = Math.min(...units.map((d) => d.t_age));
  return [b_age, t_age];
}
