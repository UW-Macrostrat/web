import h from "@macrostrat/hyper";
import {
  ColumnProvider,
  ColumnSVG,
  useColumn,
  ColumnAxis,
  LithologyColumn,
  LithologyBoxes,
  GeneralizedSectionColumn,
  GrainsizeLayoutProvider,
  ColumnDivision,
  ColumnSurface,
} from "@macrostrat/column-components";
import type { BaseUnit, UnitLong, ColumnSpec } from "@macrostrat/api-types";
import { IUnit } from "@macrostrat/column-views";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
// import "@macrostrat/timescale/dist/timescale.css";
import { useAPIResult } from "@macrostrat/ui-components";

interface IColumnProps {
  data: IUnit[];
  pixelScale?: number;
  range?: [number, number];
}

type UnitDivision = ColumnDivision & BaseUnit;

interface ColumnSurface {
  height: number;
}

const columnData: ColumnSurface[] = [
  {
    height: 0,
    pattern: "sandstone",
    grainsize: "ms",
    unit_id: 41216,
  },
  { height: 97, grainsize: "f", pattern: "limestone" },
  { height: 101, grainsize: "ms", pattern: "sandstone" },
  { height: 144, grainsize: "f", pattern: "limestone" },
  { height: 154, grainsize: "ms", pattern: "sandstone" },
  { height: 180, grainsize: "c", pattern: 606 },
  {
    height: 182,
    lithology: "limestone",
    grainsize: "m",
    pattern: "limestone",
    unit_id: 41217,
  },
  {
    height: 192,
    grainsize: "p",
    pattern: "limestone",
  },
  {
    height: 194,
    grainsize: "c",
    pattern: "limestone",
  },
  {
    height: 196,
    grainsize: "m",
    pattern: "limestone",
  },
  {
    height: 320,
    lithology: "shale",
    grainsize: "ms",
    pattern: "shale",
    unit_id: 41218,
  },
];

const patternIndex = {
  sandstone: 607,
  limestone: 627,
  shale: 620,
};

function buildDivisions<T extends ColumnSurface>(
  surfaces: T[],
  range: [number, number]
): (BaseUnit & UnitDivision & T)[] {
  const units = surfaces.filter((d) => d.unit_id != null);
  return surfaces.map((surface, i) => {
    const { height, pattern, ...rest } = surface;
    const bottom = height;
    const nextSurface = surfaces[i + 1];
    const nextHeight = nextSurface != null ? nextSurface.height : range[1];
    const nextUnit = units[i + 1];
    const nextUnitHeight = nextUnit != null ? nextUnit.height : range[1];
    return {
      top: nextHeight,
      bottom,
      t_age: bottom,
      b_age: bottom + nextUnitHeight, // this is wrong,
      lithology: pattern,
      pattern: `${patternIndex[pattern] ?? pattern}`,
      ...rest,
    };
  });
}

type HasUnitID = { unit_id: number };
function mergeUnitData<A extends HasUnitID, B extends HasUnitID>(
  sourceUnits: A[],
  result: B[]
): (A & B)[] {
  return result.map((d) => {
    const foundMatch = sourceUnits.find((u) => u.unit_id === d.unit_id);
    return { ...foundMatch, ...d };
  });
}

const height = 341.3;

const intervals: Interval[] = [
  {
    lvl: 0,
    eag: 341.3,
    lag: 0,
    oid: 0,
    nam: "Rackla Group",
  },
  {
    lvl: 1,
    eag: 0,
    lag: height - 182,
    pid: 0,
    oid: 1,
    nam: "Blueflower",
  },
  {
    nam: "Gametrail",
    lvl: 1,
    pid: 0,
    oid: 2,
    lag: height - 182,
    eag: height,
  },
];

const BaseSection = (
  props: IColumnProps & { children: React.ReactNode; params: ColumnSpec }
) => {
  // Section with "squishy" time scale
  const { data = [], range = [0, height], children, params } = props;
  let { pixelScale = 1.3 } = props;

  let divisions = buildDivisions(data, range);
  const unitData: UnitLong[] = useAPIResult("/units", params);
  // let unitDivs = buildDivisions(
  //   data.filter(d => d.unit_id != null),
  //   range
  // );
  if (unitData != null) {
    divisions = mergeUnitData(unitData, divisions);
  }

  console.log(divisions);

  return h("div.measured-section.column", [
    h(
      ColumnProvider,
      {
        divisions,
        range,
        pixelsPerMeter: pixelScale,
      },
      [
        h(
          ColumnSVG,
          {
            innerWidth: 0,
            padding: 30,
            paddingLeft: 40,
            paddingBottom: 30,
            paddingRight: 1,
          },
          [h(ColumnAxis)]
        ),
        h(Timescale, {
          intervals,
          orientation: TimescaleOrientation.VERTICAL,
          length: (range[1] - range[0]) * pixelScale,
          levels: [0, 1],
          absoluteAgeScale: true,
          showAgeAxis: false,
          ageRange: range,
        }),
        h(
          ColumnSVG,
          { innerWidth: 200, padding: 30, paddingLeft: 0, paddingBottom: 30 },
          [
            h(
              GrainsizeLayoutProvider,
              {
                width: 80,
                grainsizeScaleStart: 40,
              },
              [
                h(GeneralizedSectionColumn, [
                  h(LithologyBoxes, { resolveID: (d) => d.pattern }),
                ]),
              ]
            ),
            children,
          ]
        ),
        h("div.spacer"),
      ]
    ),
  ]);
};

export function MeasuredSection(props) {
  return h(BaseSection, { ...props, data: columnData });
}
