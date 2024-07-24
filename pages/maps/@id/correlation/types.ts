import type { IntervalShort } from "~/components/unit-details";
import type { AgeRange } from "@macrostrat-web/utility-functions";

export type CorrelationItem = {
  color: string;
  ageRange: AgeRange;
  macrostratAgeRange: AgeRange | null;
  details: LegendItem;
  id: number;
};

export interface LegendItem {
  legend_id: number;
  name: string;
  strat_name: string;
  age: string;
  lith: string;
  descrip: string;
  comments: string;
  liths: string;
  b_interval: IntervalShort;
  t_interval: IntervalShort;
  best_age_bottom?: number;
  best_age_top?: number;
  unit_ids: string;
  concept_ids: string;
  color: string;
}

export enum AgeDisplayMode {
  MapLegend,
  Macrostrat,
  Both,
}
