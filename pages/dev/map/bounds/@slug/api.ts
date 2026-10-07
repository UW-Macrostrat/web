/** The api-v3 `/bounds` routes.
 *
 * Reads are public; writes are admin-only, decided by the session cookie, so
 * every write sends credentials. Each edit returns the map's boundary as it
 * now stands, which replaces the page's copy whole. */
import { apiV3Prefix } from "@macrostrat-web/settings";
import type { Geometry } from "geojson";

export interface OperationType {
  op_id: string;
  description: string;
  /** Drawn: carries a polygon. */
  geometry: boolean;
  /** JSON Schema of the parameters. */
  parameters: { properties?: Record<string, any>; required?: string[] };
}

export interface BoundaryOperation {
  id: number;
  position: number;
  operation: string;
  parameters: Record<string, any>;
  note: string | null;
  error: string | null;
  geometry: Geometry | null;
}

export interface MapBoundary {
  source_id: number;
  slug: string;
  name: string | null;
  area_km: number | null;
  boundary_error: string | null;
  bbox: [number, number, number, number] | null;
  needs_build: boolean;
  operations: BoundaryOperation[];
}

export interface BuildReport {
  dry_run: boolean;
  written: boolean;
  unchanged: boolean;
  area_km: number | null;
  diff_km: number | null;
  error: string | null;
  failed_operation_id: number | null;
  skipped: string | null;
}

export interface NewOperation {
  operation: string;
  parameters?: Record<string, any>;
  geometry?: Geometry | null;
  note?: string | null;
}

export function fetchBoundary(slug: string): Promise<MapBoundary> {
  return request(`/bounds/${encodeURIComponent(slug)}`);
}

export function fetchOperationTypes(): Promise<OperationType[]> {
  return request("/bounds/operations");
}

export function appendOperation(slug: string, op: NewOperation): Promise<MapBoundary> {
  return request(`/bounds/${encodeURIComponent(slug)}/operations`, "POST", op);
}

export function editOperation(
  slug: string,
  id: number,
  edit: { position?: number; note?: string }
): Promise<MapBoundary> {
  return request(`/bounds/${encodeURIComponent(slug)}/operations/${id}`, "PATCH", edit);
}

export function removeOperation(slug: string, id: number): Promise<MapBoundary> {
  return request(`/bounds/${encodeURIComponent(slug)}/operations/${id}`, "DELETE");
}

export function buildBoundary(slug: string, dryRun: boolean): Promise<BuildReport> {
  const query = `?dry_run=${dryRun}`;
  return request(`/bounds/${encodeURIComponent(slug)}/build${query}`, "POST");
}

async function request(path: string, method = "GET", body?: any) {
  const init: RequestInit = { method, credentials: "include" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${apiV3Prefix}${path}`, init);
  if (res.ok) return res.json();
  throw new Error(await errorMessage(res));
}

/** FastAPI's `detail`, a string or a list of validation errors. */
async function errorMessage(res: Response): Promise<string> {
  let detail: any = null;
  try {
    detail = (await res.json())?.detail;
  } catch (err) {
    // Not JSON: fall through to the status line
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg ?? String(d)).join("; ");
  if (res.status === 401 || res.status === 403) return "Only admins can edit boundaries";
  return `${res.status} ${res.statusText}`;
}
