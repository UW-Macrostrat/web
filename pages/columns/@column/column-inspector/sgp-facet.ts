import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  BaseMeasurementsColumn,
  groupNotesByPixelDistance,
  standardizeMeasurementHeight,
  TruncatedList,
  useCompositeScale,
  useMacrostratColumnData,
} from "@macrostrat/column-views";
import type { UnitLong } from "@macrostrat/api-types";
import type { ColumnAxisType } from "@macrostrat/column-components";
import type { CompositeColumnScale } from "@macrostrat/column-views";

function useSGPData({ col_id }) {
  return useAPIResult(
    "https://dev.macrostrat.org/api/pg/sgp_unit_matches",
    {
      col_id: `eq.${col_id}`,
    },
    (d) => d
  );
}

interface SGPSampleData {
  col_id: number;
  unit_id: number;
  sgp_samples: { name: string; id: number }[];
}

export function SGPMeasurementsColumn({ columnID }) {
  const data: SGPSampleData[] | null = useSGPData({ col_id: columnID });
  const { axisType, units } = useMacrostratColumnData();
  const scale = useCompositeScale();

  if (data == null || units == null || scale == null) return null;

  const data1 = prepareSGPData(data, scale, units, axisType);

  return h(BaseMeasurementsColumn, {
    data: data1,
    noteComponent: SGPSamplesNote,
    focusedNoteComponent: SGPSamplesNote,
  });
}

function SGPSamplesNote(props: { note: any; focused: boolean }) {
  const { note, focused } = props;
  const sgp_samples = note?.data;

  if (sgp_samples == null || sgp_samples.length === 0) return null;

  return h(TruncatedList, {
    className: "sgp-samples",
    data: sgp_samples,
    itemRenderer: (p) => {
      const sgpLink = `https://test.sgp-search.io/samples/${p.data.id}`;
      return h("a", {href: sgpLink, target: "_blank"}, p.data.name);
    },
    maxItems: focused ? Infinity : 5,
  });
}

function prepareSGPData(
  data: SGPSampleData[],
  scale: CompositeColumnScale,
  units: UnitLong[],
  axisType: ColumnAxisType
) {
  // Find matching units for samples
  const d1 = data
    .map((sample) => {
      const data = sample.sgp_samples;
      if (data == null || data.length === 0) return null;
      const heightData = standardizeMeasurementHeight(
        { unit_id: sample.unit_id },
        units,
        axisType
      );
      if (heightData == null) return null;
      data.sort((a, b) => a.id - b.id);
      return {
        ...heightData,
        data,
        id: sample.unit_id,
      };
    })
    .filter(Boolean);

  return groupNotesByPixelDistance(d1, scale, axisType, 5);
}
