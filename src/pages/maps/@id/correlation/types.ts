export type AgeRange = [number, number];

export type CorrelationItem = {
  color: string;
  ageRange: AgeRange;
  details: LegendItem;
  id: number;
};

export type IntervalShort = {
  id: number;
  b_age: number;
  t_age: number;
  name: string;
  color: string;
  rank: number;
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
