import { group } from "d3-array";
import { useAPIResult } from "@macrostrat/ui-components";

export interface MeasurementInfo {
  measurement_id: number;
  measuremeta_id: number;
  measurement: string;
  measure_units: string;
  measure_phase: string;
  method: string;
  n: number;
  ref_id: number;
  sample_name: string;
  geo_unit: string;
  samp_lith: string;
  samp_lith_id: number;
  samp_desc: string;
  samp_age: string;
  lat: number;
  lng: number;
  unit_id: number;
  unit_rel_pos?: any;
  col_id: number;
  strat_name_id: number;
  match_basis: string;
  ref: string;
  measure_value: number[];
  measure_error: number[];
  measure_position: any[];
  measure_n: number[];
  sample_no: string[];
  error_units: string;
}

export function useDetritalMeasurements(columnArgs) {
  const params = {
    ...columnArgs,
    measure_phase: "zircon",
    response: "long",
    show_values: true,
    // Other isotope systems are organized separately
    measurement: "207Pb-206Pb"
  };
  const res: MeasurementInfo[] = useAPIResult(
    "https://dev.macrostrat.org/api/v2/measurements",
    params,
    columnArgs
  );
  if (res == null) return null;
  return group(res, d => d.unit_id);
}
