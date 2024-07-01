/** Correlation chart */
import { preprocessUnits } from "@macrostrat/column-views";
import { runColumnQuery } from "~/pages/map/map-interface/app-state/handlers/fetch";
import { useState, useEffect } from "react";
import { PatternProvider } from "~/_providers";
import { Column, TimescaleColumn } from "./column";
import { UnitLong } from "@macrostrat/api-types";
import { GapBoundPackage, SectionRenderData, AgeComparable } from "./types";

import h from "./main.module.sass";

export interface ColumnIdentifier {
  col_id: number;
  col_name: string;
  project_id: number;
}

export interface CorrelationChartData {
  t_age: number;
  b_age: number;
  columnData: SectionRenderData[][]; // Units for each column
}

export function CorrelationChart({ columns }: { columns: ColumnIdentifier[] }) {
  const [chartData, setChartData] = useState<CorrelationChartData | null>(null);

  useEffect(() => {
    const promises = columns.map((col) => fetchUnitsForColumn(col.col_id));
    Promise.all(promises).then((data) =>
      setChartData(buildColumnData(data, AgeScaleMode.Broken))
    );
  }, [columns]);

  if (chartData == null || chartData.columnData.length == 0) {
    return null;
  }

  console.log(chartData);

  const targetUnitHeight = 20;

  const { t_age, b_age } = chartData;
  const range = [b_age, t_age];

  const firstColumn = chartData.columnData[0];

  return h(
    PatternProvider,
    h("div.correlation-chart-inner", [
      h(TimescaleColumnExt, {
        key: "timescale",
        packages: firstColumn,
      }),
      h(
        chartData.columnData.map((packages, i) =>
          h(SingleColumn, {
            packages,
            key: i,
          })
        )
      ),
    ])
  );
}

function TimescaleColumnExt({ packages }: { packages: SectionRenderData[] }) {
  return h("div.column", [
    h(TimescaleColumn, {
      showLabels: false,
      unconformityLabels: true,
      width: 100,
      columnWidth: 100,
      packages,
    }),
  ]);
}

function SingleColumn({
  packages,
}: {
  column: ColumnIdentifier;
  packages: SectionRenderData[];
}) {
  return h("div.column", [
    h(Column, {
      data: packages,
      showLabels: false,
      unconformityLabels: true,
      width: 100,
      columnWidth: 100,
    }),
  ]);
}

type ColumnData = {
  units: UnitLong[];
  columnID: number;
};

async function fetchUnitsForColumn(col_id: number): Promise<ColumnData> {
  const res = await runColumnQuery({ col_id }, null);
  return { columnID: col_id, units: preprocessUnits(res) };
}

const targetUnitHeight = 20;

function preprocessChartData(
  columnData: SectionRenderData[][]
): CorrelationChartData {
  const [b_age, t_age] = findEncompassingScaleBounds(columnData.flat());
  return { columnData, b_age, t_age };
}

enum AgeScaleMode {
  Continuous = "continuous",
  Broken = "broken",
}

function buildColumnData(
  columns: ColumnData[],
  ageMode: AgeScaleMode = AgeScaleMode.Continuous
): CorrelationChartData {
  // Create a single gap-bound package for each column
  const units = columns.map((d) => d.units);
  const [b_age, t_age] = findEncompassingScaleBounds(units.flat());

  if (ageMode == AgeScaleMode.Continuous) {
    const dAge = b_age - t_age;
    const maxNUnits = Math.max(...units.map((d) => d.length));
    const targetHeight = targetUnitHeight * maxNUnits;
    const pixelScale = Math.ceil(targetHeight / dAge);

    const columnData: SectionRenderData[][] = columns.map((d) => {
      return [
        {
          b_age,
          t_age,
          bestPixelScale: pixelScale,
          ...d,
        },
      ];
    });

    return { columnData, b_age, t_age };
  }

  let pkgs: GapBoundPackage[] = [];
  for (const column of columns) {
    pkgs.push(...findGapBoundPackages(column));
  }
  pkgs = mergeOverlappingGapBoundPackages(pkgs);
  pkgs.sort((a, b) => a.b_age - b.b_age);

  // Get the best pixel scale for each gap-bound package
  const pixelScales = pkgs.map(findBestPixelScale);
  console.log(pixelScales);

  const columnData = columns.map((d, i) => {
    return pkgs.map((pkg): SectionRenderData => {
      const { t_age, b_age } = pkg;
      return {
        t_age,
        b_age,
        columnID: d.columnID,
        bestPixelScale: pixelScales[i],
        units: pkg.unitIndex.get(d.columnID) ?? [],
      };
    });
  });

  return { columnData, b_age, t_age };

  // const packages = findGapBoundPackagesSharedByMultipleColumns(units);
  // console.log(packages);
  // const columns = units.map((d, i) =>
  //   recoverGapBoundPackagesForColumn(packages, i)
  // );
  // return preprocessChartData(columns);
}

function findBestPixelScale(pkg: GapBoundPackage) {
  const dAge = pkg.b_age - pkg.t_age;
  const maxNUnits = Math.max(
    ...Array.from(pkg.unitIndex.values()).map((d) => d.length)
  );
  const targetHeight = targetUnitHeight * maxNUnits;
  return targetHeight / dAge;
}

function mergeOverlappingGapBoundPackages(
  packages: GapBoundPackage[]
): GapBoundPackage[] {
  // Sort by t_age
  let remainingPackages: GapBoundPackage[] = packages;
  let newPackages: GapBoundPackage[] = [];
  while (remainingPackages.length > 0) {
    const pkg = remainingPackages.pop();
    const overlapping = findOverlapping(pkg, remainingPackages);
    newPackages.push(mergePackages(pkg, ...overlapping));
    remainingPackages = remainingPackages.filter(
      (d) => !overlapping.includes(d)
    );
  }
  if (newPackages.length < packages.length) {
    return mergeOverlappingGapBoundPackages(newPackages);
  } else {
    return newPackages;
  }
  // Chunk by divisions where t_age is less than the next b_age
}

function findEncompassingScaleBounds(units: AgeComparable[]) {
  const b_age = Math.max(...units.map((d) => d.b_age));
  const t_age = Math.min(...units.map((d) => d.t_age));
  return [b_age, t_age];
}

function mergePackages(...packages: GapBoundPackage[]): GapBoundPackage {
  return packages.reduce(
    (a: GapBoundPackage, b: GapBoundPackage) => {
      a.b_age = Math.max(a.b_age, b.b_age);
      a.t_age = Math.min(a.t_age, b.t_age);
      for (let [columnID, units] of b.unitIndex) {
        if (a.unitIndex.has(columnID)) {
          a.unitIndex.set(columnID, a.unitIndex.get(columnID).concat(units));
        } else {
          a.unitIndex.set(columnID, units);
        }
      }
      return a;
    },
    {
      b_age: -Infinity,
      t_age: Infinity,
      unitIndex: new Map(),
    }
  );
}

function findGapBoundPackages(columnData: ColumnData): GapBoundPackage[] {
  /** Find chunks of units overlapping in time, separated by unconformities */
  const { units, columnID } = columnData;
  let packages: GapBoundPackage[] = [];
  for (let unit of columnData.units) {
    const newPackage: GapBoundPackage = {
      b_age: unit.b_age,
      t_age: unit.t_age,
      unitIndex: new Map([[columnID, [unit]]]),
    };

    const overlappingPackages: GapBoundPackage[] = findOverlapping(
      newPackage,
      packages
    );

    // If the unit overlaps with some packages, remove them.
    packages = packages.filter((d) => !overlappingPackages.includes(d));

    // Merge the overlapping packages with the new package
    if (overlappingPackages.length > 0) {
      packages.push(mergePackages(newPackage, ...overlappingPackages));
    } else {
      packages.push(newPackage);
    }
  }
  return packages;
}

function findOverlapping<T extends AgeComparable>(
  a: AgeComparable,
  collection: T[]
): T[] {
  return collection.filter((d) => ageOverlaps(a, d));
}

function ageOverlaps(a: AgeComparable, b: AgeComparable) {
  return a.t_age <= b.b_age && a.b_age >= b.t_age;
}
