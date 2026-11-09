import type { ColumnData } from "@macrostrat/data-provider";
import type { UnitLong } from "@macrostrat/api-types";
import { statusCodeParam } from "~/components/in-process-filter";

/** The data provider's store `fetch`, which resolves paths against its API. */
type StoreFetch = (url: string, options?: RequestInit) => Promise<Response>;

// The API leaves in-process columns out unless asked for them.
const STATUS_CODE = statusCodeParam(true);

/** The data provider's `fetchUnits`, with in-process columns included. */
export async function fetchCorrelationUnits(
  colIDs: number[],
  fetch: StoreFetch
): Promise<ColumnData[]> {
  if (colIDs.length === 0) return [];
  const params = new URLSearchParams({
    response: "long",
    col_id: colIDs.join(","),
    status_code: STATUS_CODE,
  });
  const units: UnitLong[] = await fetchV2(`/units?${params}`, fetch);

  const byColumn = new Map<number, UnitLong[]>();
  for (const unit of units) {
    const list = byColumn.get(unit.col_id) ?? [];
    list.push(unit);
    byColumn.set(unit.col_id, list);
  }
  return colIDs.map((columnID) => ({
    columnID,
    units: byColumn.get(columnID) ?? [],
  }));
}

export interface ColumnGroupSelection {
  columnIDs: number[];
  projectID: number | null;
}

/** A column group's columns, in id order, and the project that holds them. */
export async function fetchColumnGroup(
  groupID: number,
  fetch: StoreFetch
): Promise<ColumnGroupSelection> {
  const params = new URLSearchParams({
    col_group_id: String(groupID),
    status_code: STATUS_CODE,
  });
  const columns: { col_id: number; project_id: number }[] = await fetchV2(
    `/columns?${params}`,
    fetch
  );
  const columnIDs = columns.map((d) => d.col_id).sort((a, b) => a - b);
  return { columnIDs, projectID: columns[0]?.project_id ?? null };
}

async function fetchV2(url: string, fetch: StoreFetch): Promise<any> {
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Macrostrat API request failed: ${url}`);
  }
  return data.success.data;
}
