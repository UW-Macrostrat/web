export interface LithProps {
  name: string;
  type: string;
  class: string;
  prop: number;
  lith_id: number;
}

export interface EnvironProps {
  name: string;
  type: string;
  class: string;
  prop: number;
  environ_id: number;
}

export interface EconProps {
  name: string;
  type: string;
  class: string;
  prop: number;
  econ_id: number;
}

export interface GeoJSONFeature {
  type: string;
  properties: {
    col_id: number,
    col_name: string,
    col_group: string,
    col_group_id: number,
    group_col_id: string,
    lat: string,
    lng: string,
    col_area: string,
    project_id: number,
    col_type: string,
    refs: number[],
    max_thick: number,
    max_min_thick: number,
    min_min_thick: number,
    b_age: number,
    t_age: number,
    b_int_name: string,
    t_int_name: string,
    pbdb_collections: number,
    lith: LithProps[],
    environ: EnvironProps[],
    econ: EconProps[],
    t_units: number,
    t_sections: number
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface ColData {
  type: string;
  features: GeoJSONFeature[];
}

export interface LexItemPageProps {
  children: any[],
  siftLink: string;
  id: number;
  resData: ResData;
  refs: string[];
}

export interface ResData {
  name: string;
  abbrev: string;
  b_age: number;
  t_age: number;
  timescales?: Timescale[];
  strat_name?: string;
  concept_id?: number;
  color: string;
}

export interface Timescale {
  timescale_id: number;
  name: string;
}