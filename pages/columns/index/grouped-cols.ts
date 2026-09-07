import { fetchAPIV2Result } from "~/_utils";

interface ColumnResponseShort {
  col_id: number;
  col_name: string;
  col_group: string;
  col_group_id: number | null;
  /** Numeric id(s), comma-joined for several (`"1,7"`). Omitted (or null)
   * means the API's default set — the "Core columns" composite. */
  project_id?: number | string | null;
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
  /** Omitted (or null) means every project — the API's `all=true` */
  project_id?: number | null;
  columns: ColumnResponseShort[];
}

/** The request-level scope of the list, apart from the lexicon facets: which
 * projects, and which column statuses. Shared by the server data hook and the
 * page's atoms so both build the *same* request — that is what lets the page
 * recognize the server's result and skip refetching it on load. */
export interface ColumnRequestScope {
  /** Numeric id(s), comma-joined; `null` for the API's default set. */
  projectID: string | null;
  showEmpty: boolean;
  showInProcess: boolean;
}

/** What the list requests before the user touches any control. */
export const DEFAULT_REQUEST_SCOPE: Omit<ColumnRequestScope, "projectID"> = {
  showEmpty: true,
  showInProcess: false,
};

export function columnRequestParams(
  scope: ColumnRequestScope,
  facets: Partial<ColumnFilterOptions> = {}
): ColumnFilterOptions {
  const params: ColumnFilterOptions = { ...facets };
  if (scope.projectID != null) {
    params.project_id = scope.projectID;
  }
  if (!scope.showEmpty) {
    params.empty = false;
  }
  if (scope.showInProcess) {
    params.status_code = "in process,active";
  } else {
    params.status_code = "active";
  }
  return params;
}

/** Structural equality of two requests, independent of key order. */
export function sameRequestParams(
  a: ColumnFilterOptions | null,
  b: ColumnFilterOptions | null
): boolean {
  return requestKey(a) === requestKey(b);
}

function requestKey(params: ColumnFilterOptions | null): string {
  if (params == null) return "";
  const keys = Object.keys(params).sort();
  return JSON.stringify(params, keys);
}

export async function getGroupedColumns(params: ColumnFilterOptions | null) {
  const { data: columns, refs } = await fetchColumns(params ?? {});

  columns.sort((a, b) => a.col_id - b.col_id);

  const groupMap = new Map<number, ColumnGroup>();

  for (const col of columns) {
    // If the column is not part of a group, put it in an "Ungrouped" group
    if (col.col_group_id == null) {
      if (!groupMap.has(-1)) {
        groupMap.set(-1, {
          id: -1,
          name: "Ungrouped",
          project_id: col.project_id,
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
        project_id: col.project_id,
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
  /** Numeric id(s), comma-joined for several (`"1,7"`). Omitted (or null)
   * means the API's default set — the "Core columns" composite. */
  project_id?: number | string | null;
  status_code?: string;
  empty?: boolean;
  strat_names?: number[];
  strat_name_concepts?: number[];
  environments?: number[];
  intervals?: number[];
  liths?: number[];
  nameFuzzyMatch?: string;
}

async function fetchColumns(opts: ColumnFilterOptions = {}) {
  const params = new URLSearchParams();

  // No project (the shared project filter's default) means the API's default
  // set, the "Core columns" composite — the same result as `all=true`.
  const { project_id } = opts;
  if (project_id != null) {
    params.append("project_id", project_id.toString());
  } else {
    params.append("all", "true");
  }

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
