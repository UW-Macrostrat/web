import { fetchAPIV2Result } from "~/_utils";

interface ColumnResponseShort {
  col_id: number;
  col_name: string;
  col_group: string;
  col_group_id: number | null;
  project_id: number;
  status_code: string;
  lat: number;
  lng: number;
  col_area: number;
  col_type: "column" | "section";
  refs: number[];
  t_units: number;
  t_sections: number;
}

export interface ColumnGroup {
  id: number;
  name: string;
  columns: ColumnResponseShort[];
}

export async function getGroupedColumns(params: ColumnFilterOptions) {
  const { data: columns, refs } = await fetchColumns(params);

  columns.sort((a, b) => a.col_id - b.col_id);

  const groupMap = new Map<number, ColumnGroup>();

  for (const col of columns) {
    // If the column is not part of a group, put it in an "Ungrouped" group
    if (col.col_group_id == null) {
      if (!groupMap.has(-1)) {
        groupMap.set(-1, {
          id: -1,
          name: "Ungrouped",
          columns: [],
        });
      }
      groupMap.get(-1).columns.push(col);
      continue;
    }
    if (!groupMap.has(col.col_group_id)) {
      groupMap.set(col.col_group_id, {
        id: col.col_group_id,
        name: col.col_group,
        columns: [],
      });
    }
    groupMap.get(col.col_group_id).columns.push(col);
  }

  const groupsArray = Array.from(groupMap.values());

  // Sort the groups by id
  groupsArray.sort((a, b) => {
    if (a.id === -1) return 1; // Ungrouped should come last
    return a.id - b.id;
  });

  return groupsArray;
}

export interface ColumnFilterOptions {
  project_id: number;
  status_code?: string;
  empty?: boolean;
  strat_names?: number[];
  strat_name_concepts?: number[];
  environments?: number[];
  intervals?: number[];
  liths?: number[];
  nameFuzzyMatch?: string;
}

async function fetchColumns(opts: ColumnFilterOptions) {
  const params = new URLSearchParams();

  const { project_id } = opts;

  params.append("project_id", project_id.toString());

  if (opts.status_code) {
    params.append("status_code", opts.status_code);
  }

  // Empty and name fuzzy match are not supported yet
  if (opts.strat_names) {
    params.append("strat_name_id", buildQueryArg(opts.strat_names));
  }

  if (opts.strat_name_concepts) {
    params.append(
      "strat_name_concept_id",
      buildQueryArg(opts.strat_name_concepts)
    );
  }

  if (opts.environments) {
    for (const env of opts.environments) {
      params.append("env_id", env.toString());
    }
  }

  if (opts.intervals) {
    for (const iv of opts.intervals) {
      params.append("int_id", iv.toString());
    }
  }

  if (opts.liths) {
    for (const lz of opts.liths) {
      params.append("lith_id", lz.toString());
    }
  }

  const res = await fetchAPIV2Result("/columns", params);

  return res as Promise<{
    data: ColumnResponseShort[];
    refs: { [key: number]: string };
  }>;
}

function buildQueryArg(values: number[]) {
  return values.map((v) => v.toString()).join(",");
}
