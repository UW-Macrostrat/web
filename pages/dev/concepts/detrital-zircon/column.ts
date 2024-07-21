import h from "@macrostrat/hyper";
import { group } from "d3-array";
//import {ColumnProvider} from "@macrostrat/column-components/dist/cjs/context/column"
import {
  ColumnProvider,
  ColumnSVG,
  LithologyColumn,
  ColumnAxis,
  ColumnContext,
  NotesColumn,
} from "@macrostrat/column-components";
import { MacrostratColumnProvider } from "@macrostrat/api-views";
import { CompositeUnitsColumn, IUnit } from "@macrostrat/column-views";
import { useContext } from "react";

interface IColumnProps {
  data: IUnit[];
  pixelScale?: number;
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
  const { data } = props;
  let { pixelScale } = props;

  const notesOffset = 100;

  const range = [data[data.length - 1].b_age, data[0].t_age];

  if (!pixelScale) {
    // Make up a pixel scale
    const dAge = range[0] - range[1];
    const targetHeight = 20 * data.length;
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
          width: 450,
          padding: 20,
          paddingV: 15,
        },
        [
          h(AgeAxis),
          h(CompositeUnitsColumn, {
            width: 400,
            columnWidth: 90,
          }),
        ]
      ),
    ]
  );
};

const Column = (props: IColumnProps) => {
  const { data } = props;
  if (data == null) return null;

  let sectionGroups = Array.from(group(data, (d) => d.section_id));

  sectionGroups.sort((a, b) => a.t_age - b.t_age);

  return h("div.column", [
    h("div.age-axis-label", "Age (Ma)"),
    h(
      "div.main-column",
      sectionGroups.map(([id, values]) => {
        return h(`div.section-${id}`, [h(Section, { data: values })]);
      })
    ),
  ]);
};

export default Column;
