/** Correlation chart */
import { preprocessUnits, SectionInfo } from "@macrostrat/column-views";
import { runColumnQuery } from "#/map/map-interface/app-state/handlers/fetch";
import { Column, TimescaleColumn } from "./column";
import { UnitLong } from "@macrostrat/api-types";
import { GapBoundPackage, SectionRenderData, AgeComparable } from "./types";
import { useCorrelationDiagramStore } from "./state";
import { mergeAgeRanges } from "@macrostrat-web/utility-functions";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";

const h = hyper.styled(styles);

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

interface ColumnExt {
  columnID: number;
  units: UnitLong[];
}

interface MultiColumnPackageData {
  columnData: ColumnExt[];
  bestPixelScale: number;
  b_age: number;
  t_age: number;
}

interface CorrelationChartSettings {
  ageMode?: AgeScaleMode;
  targetUnitHeight?: number;
}

// Regrid chart data to go by package
function regridChartData(data: CorrelationChartData) {
  const { columnData } = data;
  let packages: MultiColumnPackageData[] = columnData[0].map((d, i) => {
    return {
      b_age: d.b_age,
      t_age: d.t_age,
      bestPixelScale: d.bestPixelScale,
      columnData: [] as ColumnExt[],
    };
  });
  for (let column of columnData) {
    for (let i = 0; i < column.length; i++) {
      packages[i].columnData.push({
        columnID: column[i].columnID,
        units: column[i].units,
      });
    }
  }

  return packages;
}

export async function buildCorrelationChartData(
  columns: ColumnIdentifier[],
  settings: CorrelationChartSettings | undefined
): Promise<CorrelationChartData> {
  const promises = columns.map((col) => fetchUnitsForColumn(col.col_id));
  return Promise.all(promises).then((data) => buildColumnData(data, settings));
}

export function CorrelationChart({ data }: { data: CorrelationChartData }) {
  const chartData = data;

  if (chartData == null || chartData.columnData.length == 0) {
    return null;
  }

  const columnWidth = 130;
  const columnSpacing = 0;

  const packages = regridChartData(data);

  const firstColumn = chartData.columnData[0];

  return h(ChartArea, [
    h(TimescaleColumnExt, {
      key: "timescale",
      packages: firstColumn,
    }),
    h("div.main-chart", [
      h(
        packages.map((pkg, i) =>
          h(Package, { data: pkg, key: i, columnWidth, columnSpacing })
        )
      ),
    ]),
  ]);
}

function Package({ data, columnSpacing, columnWidth }) {
  const { columnData, b_age, t_age, bestPixelScale } = data;

  return h("div.package", [
    // Disable the SVG overlay for now
    //h(PackageSVGOverlay, { data, columnSpacing }),
    h("div.column-container", [
      columnData.map((d, i) => {
        return h(Column, {
          data: {
            ...d,
            b_age,
            t_age,
            bestPixelScale,
          },
          width: columnWidth,
          columnSpacing,
          key: i,
        });
      }),
    ]),
  ]);
}

function PackageSVGOverlay({ data, columnWidth = 100, columnSpacing = 0 }) {
  const { b_age, t_age, bestPixelScale, columnData } = data;

  const width = (columnWidth + columnSpacing) * columnData.length;
  const height = Math.ceil((b_age - t_age) * bestPixelScale) + 2;

  const extensiveUnits = findLaterallyExtensiveUnits(data);

  const scale = (val: number) => {
    return (val - t_age) * bestPixelScale;
  };

  return h(
    "div.package-overlay",
    { style: { width, height } },
    extensiveUnits.map((d) => {
      return h(LaterallyExtensiveUnit, {
        data: d,
        scale,
        pixelScale: bestPixelScale,
        columnSpacing,
      });
    })
  );
}

function LaterallyExtensiveUnit({ data, scale, pixelScale, columnSpacing }) {
  const { b_age, t_age, strat_name_long, units } = data;
  // Build boxes by column groups
  const boxes: UnitGroupBox[] = splitStratIntoBoxes(data);

  return h(
    "div.laterally-extensive-unit",
    boxes.map((d, i) => {
      return h(StratColSpan, {
        scale,
        data: d,
        pixelScale,
        key: i,
        columnSpacing,
      });
    })
  );
}

function StratColSpan({
  data,
  scale,
  columnWidth = 100,
  columnSpacing = 0,
  pixelScale = 1,
}) {
  const { startCol, endCol, strat_name_long, t_age, b_age } = data;
  const top = scale(t_age);
  const left = startCol * (columnWidth + columnSpacing);
  const width = (endCol - startCol + 1) * (columnWidth + columnSpacing);
  const height = (b_age - t_age) * pixelScale;
  console.log(b_age, t_age, height);
  return h(
    "div.strat-col-span",
    { style: { top, height, width, left } },
    strat_name_long
  );
}

function splitStratIntoBoxes(pkg: UnitGroup): UnitGroupBox[] {
  const { strat_name_long, strat_name_id, units } = pkg;
  const boxes: UnitGroupBox[] = [];
  let currentBox: UnitGroupBox = null;
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (unit == null) {
      if (currentBox != null) {
        boxes.push(currentBox);
        currentBox = null;
      }
      continue;
    }
    if (currentBox == null) {
      currentBox = {
        startCol: i,
        endCol: i,
        strat_name_id,
        strat_name_long,
        t_age: unit.t_age,
        b_age: unit.b_age,
        units: [],
      };
    } else {
      currentBox.endCol = i;
    }
    currentBox.units.push(unit);
  }
  return boxes;
}

function ChartArea({ children }) {
  const setSelectedUnit = useCorrelationDiagramStore(
    (state) => state.setSelectedUnit
  );

  return h(
    "div.correlation-chart-inner",
    {
      onClick() {
        setSelectedUnit(null);
      },
    },
    children
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

type ColumnData = {
  units: UnitLong[];
  columnID: number;
};

async function fetchUnitsForColumn(col_id: number): Promise<ColumnData> {
  const res = await runColumnQuery({ col_id }, null);

  return { columnID: col_id, units: preprocessUnits(res) };
}

export enum AgeScaleMode {
  Continuous = "continuous",
  Broken = "broken",
}

function buildColumnData(
  columns: ColumnData[],
  settings: CorrelationChartSettings | undefined
): CorrelationChartData {
  const { ageMode = AgeScaleMode.Continuous, targetUnitHeight = 10 } =
    settings ?? {};

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
  const pixelScales = pkgs.map((pkg) =>
    findBestPixelScale(pkg, { targetUnitHeight })
  );

  const columnData = columns.map((d) => {
    return pkgs
      .map((pkg, i): SectionRenderData => {
        const { t_age, b_age } = pkg;
        let units = pkg.unitIndex.get(d.columnID) ?? [];

        units.sort((a, b) => a.b_age - b.b_age);

        return {
          t_age,
          b_age,
          columnID: d.columnID,
          bestPixelScale: pixelScales[i],
          units,
        };
      })
      .sort((a, b) => a.b_age - b.b_age);
  });

  return { columnData, b_age, t_age };
}

interface UnitGroup {
  b_age: number;
  t_age: number;
  strat_name_id: number;
  strat_name_long: string;
  units: (UnitLong | null)[];
}

interface UnitGroupBox extends UnitGroup {
  units: UnitLong[];
  startCol: number;
  endCol: number;
}

function findLaterallyExtensiveUnits(pkg: MultiColumnPackageData): UnitGroup[] {
  const { columnData, b_age, t_age } = pkg;
  // Group units by strat_name_id
  const unitIndex = new Map<number, Map<number, UnitLong>>();
  for (const column of columnData) {
    const { units } = column;
    for (const unit of units) {
      if (unit.strat_name_id == null) continue;
      if (!unitIndex.has(unit.strat_name_id)) {
        unitIndex.set(unit.strat_name_id, new Map());
      }
      unitIndex.get(unit.strat_name_id).set(column.columnID, unit);
    }
  }

  // Prepare grouped units for rendering
  const unitGroups: UnitGroup[] = [];
  for (const [strat_name_id, unitIndex0] of unitIndex) {
    const units = columnData.map((d) => unitIndex0.get(d.columnID) ?? null);
    const filteredUnits = units.filter((d) => d != null);
    const [t_age, b_age] = mergeAgeRanges(
      filteredUnits.map((d) => [d.t_age, d.b_age])
    );
    if (filteredUnits.length <= 1) continue;

    unitGroups.push({
      b_age,
      t_age,
      strat_name_id,
      strat_name_long: filteredUnits[0].strat_name_long,
      units,
    });
  }

  return unitGroups;
}

interface PixelScaleOptions {
  targetUnitHeight: number;
}

function findBestPixelScale(
  pkg: SectionInfo,
  options: PixelScaleOptions
): number {
  const { targetUnitHeight } = options;
  const dAge = pkg.b_age - pkg.t_age;
  const maxNUnits = Math.max(
    ...Array.from(pkg.unitIndex.values()).map((d) => d.length)
  );
  let targetHeight = targetUnitHeight * maxNUnits;

  targetHeight = Math.max(targetHeight, 25, dAge / 25);

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
