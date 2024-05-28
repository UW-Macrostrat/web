import h from "@macrostrat/hyper";
import { group } from "d3-array";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  ColumnProvider,
  ColumnSVG,
  ColumnAxis,
  ColumnContext,
} from "@macrostrat/column-components";
import { SimpleUnitsColumn, IUnit } from "@macrostrat/column-views";
import { useContext } from "react";
import { IsotopesColumn } from "@macrostrat/concept-app-helpers";
import { MacrostratColumnProvider } from "@macrostrat/api-views";
import "./main.styl";

interface IColumnProps {
  data: IUnit[];
  pixelScale?: number;
  isOldestColumn: boolean;
  range?: [number, number];
}

const AgeAxis = ({ ticks }) => {
  const { pixelHeight } = useContext(ColumnContext);
  // A tick roughly every 40 pixels
  let v = Math.max(Math.round(pixelHeight / 40), 1);

  return h(ColumnAxis, {
    ticks: v,
    showDomain: false,
  });
};

const Section = (props: IColumnProps) => {
  // Section with "squishy" time scale
  const {
    data,
    isOldestColumn = true,
    range = [data[data.length - 1].b_age, data[0].t_age],
  } = props;
  let { pixelScale } = props;

  const notesOffset = 100;

  if (!pixelScale) {
    // Make up a pixel scale
    const dAge = range[0] - range[1];
    const targetHeight = 50 * data.length;
    pixelScale = Math.ceil(targetHeight / dAge);
  }

  return h(
    MacrostratColumnProvider,
    {
      divisions: data,
      range,
      pixelsPerMeter: pixelScale, // Actually pixels per myr
    },
    [
      h(
        ColumnSVG,
        {
          width: 650,
          padding: 20,
          paddingTop: 5,
          paddingBottom: 25,
        },
        [
          h(AgeAxis),
          h(SimpleUnitsColumn, {
            width: 400,
            columnWidth: 90,
          }),
          h(IsotopesColumn, {
            parameter: "D13C",
            label: "δ¹³C",
            width: 100,
            nTicks: 4,
            showAxis: isOldestColumn,
            transform: "translate(250,0)",
          }),
          h(IsotopesColumn, {
            parameter: "D18O",
            label: "δ¹⁸O",
            color: "red",
            domain: [-40, 0],
            width: 100,
            nTicks: 4,
            showAxis: isOldestColumn,
            transform: "translate(370,0)",
          }),
        ]
      ),
    ]
  );
};

function Column(props: IColumnProps) {
  const { params } = props;
  const data: IUnit[] = useAPIResult("/units", {
    all: true,
    ...params,
    response: "long",
  });
  if (data == null) return null;

  let sectionGroups = Array.from(group(data, (d) => d.section_id));

  sectionGroups.sort((a, b) => a.t_age - b.t_age);

  return h("div.column", [
    h("div.age-axis-label", "Age (Ma)"),
    h(
      "div.main-column",
      sectionGroups.map(([id, values], i) => {
        return h(`div.section-${id}`, [
          h(Section, {
            data: values,
            isOldestColumn: i == sectionGroups.length - 1,
          }),
        ]);
      })
    ),
  ]);
}

export { Section, IColumnProps };
export default Column;
