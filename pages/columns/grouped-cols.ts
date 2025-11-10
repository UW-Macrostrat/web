import { fetchAPIData, fetchPGData } from "~/_utils";
import { postgrest } from "~/_providers";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

export async function getGroupedColumns(params: ColumnFilterOptions) {
  const [columnResponse, groups] = await Promise.all([
    fetchColumns(params),
    fetchAPIData(`/defs/groups`, { all: true }),
  ]);

  const { data: columns, error } = columnResponse;

  if (!columns || error) {
    return null;
  }

  columns.sort((a, b) => a.col_id - b.col_id);

  // Group by col_group
  // Create a map of column groups
  const groupMap = new Map<number, ColumnGroup>(
    groups.map((g) => [
      g.col_group_id,
      { name: g.name, id: g.col_group_id, columns: [] },
    ])
  );
  groupMap.set(-1, {
    id: -1,
    name: "Ungrouped",
    columns: [],
  });

  for (const col of columns) {
    const col_group_id = col.col_group_id ?? -1;
    const group = groupMap.get(col_group_id);
    group.columns.push(col);
  }

  const groupsArray = Array.from(groupMap.values()).filter(
    (g) => g.columns.length > 0
  );

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
  intervals?: number[];
  liths?: number[];
  nameFuzzyMatch?: string;
}

async function fetchColumns(opts: ColumnFilterOptions) {
  const { project_id } = opts;

  const req = postgrest
    .from("col_data")
    .select("col_id,col_group_id,project_id,name,status_code,empty")
    .eq("project_id", project_id);

  if (opts.status_code) {
    req.eq("status_code", opts.status_code);
  }

  if (opts.empty !== undefined) {
    req.eq("empty", opts.empty);
  }

  if (opts.strat_names && opts.strat_names.length > 0) {
    containsFilter(req, "strat_names", opts.strat_names);
  }

  if (opts.intervals && opts.intervals.length > 0) {
    containsFilter(req, "intervals", opts.intervals);
  }

  if (opts.liths && opts.liths.length > 0) {
    containsFilter(req, "liths", opts.liths);
  }

  if (opts.nameFuzzyMatch) {
    req.ilike("name", `%${opts.nameFuzzyMatch}%`);
  }

  return req;
}

function containsFilter(
  req: PostgrestFilterBuilder<any>,
  field: string,
  values: any[]
) {
  // For some reason we get the wrong brackets style
  return req.filter(field, "cs", `[${stringifyArray(values).join(",")}]`);
}

function stringifyArray(arr: any[]): string[] {
  return arr.map((i) => `${i}`);
}
