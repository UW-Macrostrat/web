/** api_v3's admin-gated `/tasks` routes: the catalog of registered management
 * tasks, their runs, and a run's live terminal output. */
import { apiV3Prefix } from "@macrostrat-web/settings";

export const tasksPrefix = `${apiV3Prefix}/tasks`;

export interface JSONSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: any;
  properties?: Record<string, JSONSchema>;
  anyOf?: JSONSchema[];
  items?: JSONSchema;
  required?: string[];
}

export interface TaskInfo {
  name: string;
  title: string;
  description: string;
  params_schema: JSONSchema;
}

export type RunState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "killed";

export interface Run {
  id: string;
  task: string;
  params: Record<string, any>;
  requested_by: number | null;
  requested_by_name: string | null;
  celery_task_id: string | null;
  state: RunState;
  created_on: string;
  started_on: string | null;
  finished_on: string | null;
  result: any;
  error: string | null;
}

export function isLive(run: Run): boolean {
  return run.state === "queued" || run.state === "running";
}

/** The API has no `/tasks` routes: an older api_v3, or the runner not deployed. */
export class TaskServiceUnavailable extends Error {}

async function tasksFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${tasksPrefix}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail != null) detail = describeDetail(body.detail);
    } catch {}
    throw new Error(detail);
  }
  return response.json();
}

/** A 422's detail is pydantic's error list; everything else is a sentence. */
function describeDetail(detail: any): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => `${(e.loc ?? []).join(".")}: ${e.msg ?? JSON.stringify(e)}`)
      .join("; ");
  }
  return JSON.stringify(detail);
}

export async function fetchTasks(): Promise<TaskInfo[]> {
  const response = await fetch(tasksPrefix, { credentials: "include" });
  if (response.status === 404) throw new TaskServiceUnavailable();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function fetchRuns(limit = 50): Promise<Run[]> {
  return tasksFetch(`/runs?limit=${limit}`);
}

export function fetchRun(id: string): Promise<Run> {
  return tasksFetch(`/runs/${id}`);
}

export function startRun(
  task: string,
  params: Record<string, any>
): Promise<Run> {
  return tasksFetch("/runs", {
    method: "POST",
    body: JSON.stringify({ task, params }),
  });
}

export function cancelRun(id: string): Promise<Run> {
  return tasksFetch(`/runs/${id}/cancel`, { method: "POST" });
}

export function killRun(id: string): Promise<Run> {
  return tasksFetch(`/runs/${id}/kill`, { method: "POST" });
}

/** The Server-Sent Events stream of a run's terminal output. */
export function runOutputURL(id: string): string {
  return `${tasksPrefix}/runs/${id}/output`;
}

export function runURL(id: string): string {
  return `/dashboard/admin/tasks/${id}`;
}
