import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  BaseMeasurementsColumn,
  TruncatedList,
} from "@macrostrat/column-views";
import { apiDomain } from "@macrostrat-web/settings";

function useSGPData({ col_id }) {
  const res = useAPIResult(
    apiDomain + "/api/pg/sgp_unit_matches",
    {
      col_id: `eq.${col_id}`,
    },
    (d) => d
  );
  return res;
}

export function SGPMeasurementsColumn({ columnID }) {
  const data = useSGPData({ col_id: columnID });

  if (data == null) return null;

  return h(BaseMeasurementsColumn, {
    data,
    noteComponent: SGPSamplesNote,
  });
}

function SGPSamplesNote(props) {
  const { note } = props;
  const sgp_samples = note?.data?.sgp_samples;

  if (sgp_samples == null || sgp_samples.length === 0) return null;

  return h(TruncatedList, {
    className: "sgp-samples",
    data: sgp_samples,
    itemRenderer: (p) => h("span", p.data.name),
  });
}
