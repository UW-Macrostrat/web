import hyper from "@macrostrat/hyper";
import { group, extent } from "d3-array";
import {
  ColumnSVG,
  ColumnLayoutContext,
  ColumnAxisType,
  NotesColumn,
  AgeAxis,
} from "@macrostrat/column-components";
import { useContext } from "react";
import {
  AnnotatedUnitsColumn,
  MacrostratColumnProvider,
} from "@macrostrat/column-views";
import { IUnit } from "@macrostrat/column-views";
import { TrackedLabeledUnit } from "@macrostrat/column-views";
import { useAPIResult } from "@macrostrat/ui-components";
import { useColumnNav } from "@macrostrat/column-views";
import {
  AgeModelColumn,
  AgeModelDataset,
  useColumnAgeModel,
} from "./age-model-column";
// import "@macrostrat/timescale/dist/timescale.css";
import { Timescale } from "@macrostrat/timescale";
import styles from "./age-model.module.styl";

const h = hyper.styled(styles);

interface ColumnProps {
  data: IUnit[];
  pixelScale?: number;
  range?: [number, number];
  unitComponent: React.FunctionComponent<any>;
  unitComponentProps?: any;
  axisType?: ColumnAxisType;
  width?: number;
}

function getRange(data, axisType: ColumnAxisType = ColumnAxisType.AGE) {
  const key = transformAxisType(axisType);
  return [data[data.length - 1]["b_" + key], data[0]["t_" + key]];
}

function FossilData({ width }) {
  const { col_id } = useColumnNav();
  const data =
    useAPIResult(
      "http://strata.geology.wisc.edu/syenite/offshore_fossils.php",
      { col_id },
      (res) => res
    ) ?? [];

  const notes = data.map((d, i) => {
    return {
      note: d.name + ": " + d.taxa.map((d) => d.taxon).join(", "),
      height: d.depth,
      id: i,
    };
  });

  return h(NotesColumn, { editable: false, notes, width });
}

function FossilColumn(props) {
  const { width } = props;
  return h("div.fossil-column", [
    h(
      ColumnSVG,
      {
        width: width - 22,
        padding: 20,
        paddingLeft: 50,
        paddingV: 10,
        paddingBottom: 20,
      },
      [h(FossilData, { width: width - 200 })]
    ),
  ]);
}

const Section = (props: ColumnProps) => {
  // Section with "squishy" time scale

  const {
    data,
    axisType,
    range = getRange(data, axisType),
    unitComponent,
    width = 550,
    ageWidth,
    ageData,
    ageBounds,
    mode,
  } = props;
  let { pixelScale } = props;

  const dHeight = range[0] - range[1];

  if (!pixelScale) {
    // Make up a pixel scale
    const targetHeight = 20 * data.length;
    pixelScale = Math.ceil(targetHeight / dHeight);
  }

  return h(
    MacrostratColumnProvider,
    {
      divisions: data,
      range,
      axisType: "depth",
      pixelsPerMeter: pixelScale, // Actually pixels per myr
    },
    [
      h(AgeAxis, {
        width: 22,
        paddingV: 10,
        paddingBottom: 20,
        paddingLeft: 20,
        showLabel: false,
        showDomain: true,
      }),
      h(
        ColumnSVG,
        {
          width: 170 + 150,
          padding: 20,
          paddingLeft: 1,
          paddingV: 10,
          paddingBottom: 20,
          style: {
            marginRight: -150,
          },
          className: "main-section",
        },
        h(AnnotatedUnitsColumn, {
          width: 350,
          columnWidth: 150,
          gutterWidth: 0,
          axisType,
          unitComponent,
          unitComponentProps: {
            nColumns: 1,
          },
          minimumLabelHeight: 0.5,
          nameForDivision: (d) => {
            return d.unit_name
              .replace(/[\d\.]+-[\d\.]+( mbsf)?: /g, "")
              .toLowerCase();
          },
        })
      ),
      h.if(mode == "fossils")(FossilColumn, { width }),
      h.if(mode == "age-model")("div.age-model", [
        h(
          ColumnSVG,
          {
            width: width - 22,
            padding: 20,
            paddingLeft: 1,
            paddingV: 10,
            paddingBottom: 20,
          },
          h(
            AgeModelColumn,
            {
              width: ageWidth,
              nTicks: 10,
              domain: ageBounds,
            },
            [
              h(AgeModelDataset, {
                data: ageData,
                stroke: "green",
                strokeWidth: 2,
              }),
              // h(ReconstructedColumnAgeDataset, {
              //   stroke: "red",
              //   strokeWidth: 2
              // })
            ]
          )
        ),
      ]),
    ]
  );
};

export function UnitComponent({ division, nColumns = 2, ...rest }) {
  const { width } = useContext(ColumnLayoutContext);

  //const nCols = Math.min(nColumns, division.overlappingUnits.length+1)
  //console.log(division);
  const nOverlaps = division.overlappingUnits.length ?? 0;
  return h(TrackedLabeledUnit, {
    division,
    ...rest,
    axisType: "pos",
    width: nOverlaps > 0 ? width / nColumns : width,
    x: (division.column * width) / nColumns,
  });
}

const AgeAxisLabel = ({ axisType: ColumnAxisType, axisLabel }) => {
  if (axisLabel == null) {
    axisLabel = "Height (meters)";
    if (ColumnAxisType === ColumnAxisType.AGE) {
      axisLabel = "Age (myr)";
    }
  }
  return h("div.age-axis-label", axisLabel);
};

const Column = (props: ColumnProps) => {
  const {
    data,
    unitComponent = UnitComponent,
    axisType,
    width = 550,
    mode,
  } = props;

  let sectionGroups = Array.from(group(data, (d) => d.section_id));

  sectionGroups.sort((a, b) => a["t_" + axisType] - b["t_" + axisType]);

  const ageWidth = width - 100 - 170 - 32;

  const ageData = useColumnAgeModel() ?? [];

  let ageBounds = extent(ageData, (d) => d.model_age);
  ageBounds.reverse();

  return h("div.column", [
    h(AgeAxisLabel, { axisType, axisLabel: "Depth (meters below seafloor)" }),
    h("div.main-column", [
      sectionGroups.map(([id, values]) => {
        return h(`div.section.section-${id}`, [
          h(Section, {
            //pixelScale: 5,
            data: values,
            axisType,
            unitComponent,
            width: width - 100,
            ageWidth,
            ageData,
            ageBounds,
            mode,
          }),
        ]);
      }),
      //h(FossilData),
      h.if(ageBounds != null && mode == "age-model")(
        "div.timescale-container",
        {
          style: { marginLeft: 170 + 22, paddingLeft: 2, width: ageWidth + 4 },
        },
        [
          h(Timescale, {
            orientation: "horizontal",
            absoluteAgeScale: true,
            length: ageWidth,
            ageRange: ageBounds,
            levels: [3, 4],
          }),
          h("div.axis-label", "Age (Ma)"),
        ]
      ),
    ]),
  ]);
};

export { Section, AgeAxis };
export default Column;
