import hyper from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import {
  BaseMeasurementsColumn,
  IsotopesColumn,
  MeasurementDataProvider,
  TruncatedList,
} from "@macrostrat/column-views";
import { apiDomain } from "@macrostrat-web/settings";
import styles from "./index.module.sass";

const h = hyper.styled(styles);

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

export function StableIsotopesColumn({ columnID }) {
  return h(
    "div.isotopes-column",
    h(MeasurementDataProvider, { col_id: columnID }, [
      h(IsotopesColumn, {
        parameter: "D13C",
        label: "δ¹³C",
        color: "dodgeblue",
        domain: [-14, 6],
        width: 100,
        nTicks: 4,
      }),
      h(IsotopesColumn, {
        parameter: "D18O",
        label: "δ¹⁸O",
        color: "red",
        domain: [-40, 0],
        width: 100,
        nTicks: 4,
      }),
    ])
  );
}
