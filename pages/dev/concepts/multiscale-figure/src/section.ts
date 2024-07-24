import h from "@macrostrat/hyper";
import {
  ColumnProvider,
  ColumnSVG,
  useColumn,
} from "@macrostrat/column-components";
import { AgeAxis } from "@macrostrat/concept-app-helpers";
import { IUnit } from "@macrostrat/column-views";
import { Timescale, TimescaleOrientation } from "@macrostrat/timescale";
//import "../../../packages/timescale/dist/timescale.css";
import { preprocessUnits } from "@macrostrat/concept-app-helpers";
import { MacrostratColumnProvider } from "@macrostrat/api-views";

interface IColumnProps {
  data: IUnit[];
  pixelScale?: number;
  range?: [number, number];
}

const BaseSection = (props: IColumnProps & { children: React.ReactNode }) => {
  // Section with "squishy" time scale
  const {
    data = [],
    range = [data[data.length - 1].b_age, data[0].t_age],
    children,
  } = props;
  let { pixelScale } = props;

  const dAge = range[0] - range[1];

  if (!pixelScale) {
    // Make up a pixel scale
    const targetHeight = 20 * data.length;
    pixelScale = Math.ceil(targetHeight / dAge);
  }

  return h([
    h(
      MacrostratColumnProvider,
      {
        divisions: data,
        range,
        pixelsPerMeter: pixelScale, // Actually pixels per myr
      },
      [
        h(AgeAxis, {
          tickSpacing: 80,
          width: 40,
          padding: 0,
          paddingRight: 30,
          paddingV: 30,
        }),

        h(Timescale, {
          orientation: TimescaleOrientation.VERTICAL,
          length: dAge * pixelScale,
          levels: [2, 3],
          absoluteAgeScale: true,
          showAgeAxis: false,
          ageRange: range,
        }),
      ]
    ),
    children,
  ]);
};

function InteriorSection(props: React.PropsWithChildren<IColumnProps>) {
  const { data, range, pixelScale, children, width = 350 } = props;
  const { pixelsPerMeter } = useColumn();
  const divisions = preprocessUnits(data);

  return h(
    MacrostratColumnProvider,
    {
      divisions,
      range,
      pixelsPerMeter: pixelScale, // Actually pixels per myr
    },
    [
      h(
        ColumnSVG,
        {
          width,
          padding: 5,
          paddingLeft: 0,
          paddingV: 30,
        },

        children
      ),
    ]
  );
}

export { BaseSection, InteriorSection, AgeAxis };
