import {
  ColumnLayoutContext,
  ColumnProvider,
  ColumnSVG,
} from "@macrostrat/column-components";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
import { useDarkMode } from "@macrostrat/ui-components";
import classNames from "classnames";
import { useContext, useMemo } from "react";

import { AgeAxis } from "@macrostrat/column-views";
import { SectionRenderData } from "./types";
import {
  CompositeUnitsColumn,
  TrackedLabeledUnit,
  useSelectedUnit,
} from "@macrostrat/column-views";
import { useRef, useEffect } from "react";
import { ColumnAxisType, useColumn } from "@macrostrat/column-components";
import { useCorrelationDiagramStore } from "./state";
import styles from "./column.module.scss";
import hyper from "@macrostrat/hyper";
import { UnitDetailsPanel } from "@macrostrat/column-views";
import { UnitDetailsPopover } from "~/components/unit-details";
import { ColumnIdentifier } from "#/columns/correlation/correlation-chart";

const h = hyper.styled(styles);

export function MacrostratColumnProvider(props) {
  // A column provider specialized the Macrostrat API
  return h(ColumnProvider, { axisType: ColumnAxisType.AGE, ...props });
}

interface ISectionProps {
  data: SectionRenderData;
  unitComponent?: React.FunctionComponent<any>;
  unitComponentProps?: any;
  showLabels?: boolean;
  width?: number;
  columnWidth?: number;
  targetUnitHeight?: number;
}

function Section(props: ISectionProps) {
  // Section with "squishy" timescale
  const {
    data,
    unitComponent,
    showLabels = true,
    width = 300,
    columnWidth = 150,
    unitComponentProps,
  } = props;

  const expanded = useCorrelationDiagramStore((s) => s.mapExpanded);

  const { units, bestPixelScale: pixelScale, t_age, b_age } = data;
  const range = [b_age, t_age];

  const dAge = range[0] - range[1];

  const height = dAge * pixelScale;

  /** Ensure that we can arrange units into the maximum number
   * of columns defined by unitComponentProps, but that we don't
   * use more than necessary.
   */
  const _unitComponentProps = useMemo(() => {
    return {
      ...unitComponentProps,
      nColumns: Math.min(
        Math.max(...units.map((d) => d.column)) + 1,
        unitComponentProps?.nColumns ?? 2
      ),
    };
  }, [units, unitComponentProps]);

  return h(
    MacrostratColumnProvider,
    {
      divisions: units,
      range,
      pixelsPerMeter: pixelScale, // Actually pixels per myr
    },
    [
      h(
        ColumnSVG,
        {
          innerWidth: showLabels ? width : columnWidth,
          paddingRight: 1,
          paddingLeft: 1,
          paddingV: 10,
          innerHeight: height,
        },
        h(CompositeUnitsColumn, {
          width: columnWidth,
          columnWidth,
          gutterWidth: 5,
          showLabels: false,
          unitComponent,
          unitComponentProps: _unitComponentProps,
          clipToFrame: false,
        })
      ),
      h.if(!expanded)(SelectedUnitPopover, { width }),
    ]
  );
}

export function UnitComponent({ division, nColumns = 2, ...rest }) {
  const { width } = useContext(ColumnLayoutContext);

  return h(TrackedLabeledUnit, {
    division,
    ...rest,
    width: division.overlappingUnits.length > 0 ? width / nColumns : width,
    x: (division.column * width) / nColumns,
  });
}

function Unconformity({ upperUnits = [], lowerUnits = [], style }) {
  if (upperUnits.length == 0 || lowerUnits.length == 0) {
    return null;
  }

  const ageGap = lowerUnits[0].t_age - upperUnits[upperUnits.length - 1].b_age;

  return h(
    "div.unconformity",
    { style },
    h("div.unconformity-text", `${ageGap.toFixed(1)} Ma`)
  );
}

export function Column({
  data,
}: {
  column: ColumnIdentifier;
  data: SectionRenderData;
}) {
  const darkMode = useDarkMode();

  const className = classNames({
    "dark-mode": darkMode?.isEnabled ?? false,
  });

  return h(
    "div.column-container",
    { className },
    h("div.column", [
      h(`div.section`, [
        h(Section, {
          data,
          unitComponent: UnitComponent,
          showLabels: false,
          width: 100,
          columnWidth: 100,
        }),
      ]),
    ])
  );
}

interface TimescaleColumnProps {
  packages: SectionRenderData[];
  className?: string;
  showLabels?: boolean;
  unconformityLabels: boolean;
}

export function TimescaleColumn(props: TimescaleColumnProps) {
  const {
    className: baseClassName,
    packages,
    columnWidth = 100,
    unconformityLabels = true,
  } = props;

  const darkMode = useDarkMode();

  const className = classNames(baseClassName, {
    "dark-mode": darkMode?.isEnabled ?? false,
  });

  return h(
    "div.column-container",
    { className },
    h("div.column", [
      h("div.age-axis-label", "Age (Ma)"),
      h(
        "div.main-column",
        packages.map((data, i) => {
          const range = [data.b_age, data.t_age];
          const pixelScale = data.bestPixelScale;
          let upperUnits = [];
          if (i != 0) {
            upperUnits = [packages[i - 1]];
          }
          const lowerUnits = [data];

          return h([
            h.if(unconformityLabels)(Unconformity, {
              upperUnits,
              lowerUnits,
              style: { width: columnWidth },
            }),
            h(`div.section.section-${i}`, [
              h(TimescaleSection, {
                range,
                pixelScale,
              }),
            ]),
          ]);
        })
      ),
    ])
  );
}

function TimescaleSection(props: {
  range: [number, number];
  pixelScale: number;
}) {
  // Section with "squishy" timescale
  const { range, pixelScale } = props;

  const dAge = range[0] - range[1];
  const height = dAge * pixelScale;

  return h(
    MacrostratColumnProvider,
    {
      divisions: [],
      range,
      pixelsPerMeter: pixelScale, // Actually pixels per myr
    },
    [
      h(AgeAxis, {
        width: 20,
        padding: 0,
        paddingV: 10,
        showLabel: false,
      }),
      h("div.timescale-container", { style: { marginTop: `10px` } }, [
        h(Timescale, {
          orientation: TimescaleOrientation.VERTICAL,
          length: height,
          levels: [2, 4],
          absoluteAgeScale: true,
          showAgeAxis: false,
          ageRange: range,
        }),
      ]),
    ]
  );
}

function SelectedUnitPopover<T>({ width }: { width: number }) {
  const { scale, divisions } = useColumn();

  const item0 = useSelectedUnit();
  const item = divisions.find((d) => d.unit_id == item0?.unit_id);

  const scrollParentRef = useRef(null);
  useEffect(() => {
    scrollParentRef.current = document.getElementsByClassName(
      styles["overlay-safe-area"]
    )[0];
  }, []);

  if (item == null) {
    return null;
  }

  const { t_age, b_age } = item0;
  const range = [b_age, t_age];

  const content = h(UnitDetailsPanel, { unit: item });

  const top = scale(range[1]) + 10;
  const bottom = scale(range[0]) + 10;

  return h(
    UnitDetailsPopover,
    {
      style: {
        top,
        left: 0,
        width,
        height: bottom - top,
      },
      boundary: scrollParentRef.current,
    },
    content
  );
}
