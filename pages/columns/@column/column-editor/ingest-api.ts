/** The column-ingestion API (`/columns/ingest`, `/columns/submit`): uploading
 * a workbook or submitting the format's tables as JSON, then polling the task
 * for its result. Both paths run the same Python, and both come back as one
 * `IngestResult` — a summary, graded notices, and the ingested data as the
 * API would serve it. Pure fetch helpers; the editor and the upload form
 * share them. */
import { apiV3Prefix } from "@macrostrat-web/settings";

export type NoticeLevel = "info" | "warning" | "error";

/** One graded data-quality notice from the ingestion library. */
export interface IngestNotice {
  level: NoticeLevel;
  /** A stable identifier for the check, e.g. `unknown-environment`. */
  code: string;
  message: string;
  sheet?: string;
  /** Spreadsheet row, header included (so the first data row is 2). */
  row?: number;
  column?: string;
  /** The dataset's own column id. */
  col_id?: string;
  unit?: string;
  section?: string;
  detail?: Record<string, any>;
}

export interface IngestSummary {
  project: { id: number; slug: string; name: string };
  col_group_id: number;
  /** Written columns by id — or, from an older backend, parsed previews
   * (`{columnInfo, units}`) for the editor to open as drafts. */
  columns: any[];
  n_columns: number;
  n_units: number;
  n_references: number;
  dry_run: boolean;
}

/** The ingested columns as the web API would serve them (see `payload.py`).
 * On a dry run every id is a negative provisional one. */
export interface IngestData {
  columns: any[];
  units: any[];
  boundaries: any[];
  facies: FaciesDef[];
}

/** A facies of the dataset's scheme, with its resolved vocabulary. */
export interface FaciesDef {
  facies_id: string;
  facies: string;
  facies_group?: string | null;
  description?: string | null;
  interpretation?: string | null;
  color?: string | null;
  lithology?: string | null;
  environment?: string | null;
  lith: { lith_id: number; name: string; prop: number | null; atts: string[] }[];
  environ: { environ_id: number; name: string }[];
}

export interface IngestResult {
  dry_run: boolean;
  /** No error-level notices. */
  ok: boolean;
  summary: IngestSummary | null;
  notices: IngestNotice[];
  notice_counts: Record<NoticeLevel, number>;
  data: IngestData | null;
}

/** The format's tables as JSON: metadata as key/value pairs, the rest as
 * rows. What the editor submits. */
export interface ColumnSubmission {
  metadata: Record<string, string | number | null>;
  columns: Record<string, any>[];
  units: Record<string, any>[];
  refs?: Record<string, any>[];
  facies?: Record<string, any>[];
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

async function readError(res: Response, what: string): Promise<Error> {
  const text = await res.text();
  return new Error(`${what} failed (${res.status}): ${text}`);
}

/** Poll a task until it finishes; the task's own result, unwrapped. */
export async function pollIngestTask(taskId: string): Promise<IngestResult> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const res = await fetch(`${apiV3Prefix}/columns/ingest/${taskId}`, {
      credentials: "include",
    });
    if (!res.ok) throw await readError(res, "Status check");
    const body = await res.json();
    if (body.state === "FAILURE") {
      throw new Error(body.error ?? "Ingestion task failed.");
    }
    if (body.state === "SUCCESS") return unwrapTaskResult(body.result);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for the ingestion task to finish.");
}

/** Both tasks wrap the ingest's result under `result`.
 *
 * A backend from before the one-result shape returns the summary itself
 * there, with a `columns` preview and no notices; it is carried as the
 * summary so the upload page can still open its columns. */
function unwrapTaskResult(result: any): IngestResult {
  let inner = result?.result ?? result ?? {};
  if (inner.summary === undefined && inner.n_units !== undefined) {
    inner = { summary: inner, ok: true, notices: [], data: null, dry_run: inner.dry_run };
  }
  return {
    dry_run: inner.dry_run ?? result?.dry_run ?? true,
    ok: inner.ok ?? false,
    summary: inner.summary ?? null,
    notices: inner.notices ?? [],
    notice_counts: inner.notice_counts ?? { info: 0, warning: 0, error: 0 },
    data: inner.data ?? null,
  };
}

/** Upload a workbook and wait for its result. */
export async function ingestColumnFile(
  file: File,
  dryRun: boolean
): Promise<IngestResult> {
  const data = new FormData();
  data.append("file", file, file.name);
  data.append("dry_run", String(dryRun));
  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch(`${apiV3Prefix}/columns/ingest`, {
    method: "POST",
    credentials: "include",
    body: data,
  });
  if (!res.ok) throw await readError(res, "Upload");
  const { task_id } = await res.json();
  return pollIngestTask(task_id);
}

/** Submit the format's tables as JSON and wait for the result. */
export async function submitColumnData(
  submission: ColumnSubmission,
  dryRun: boolean
): Promise<IngestResult> {
  const res = await fetch(`${apiV3Prefix}/columns/submit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: submission, dry_run: dryRun }),
  });
  if (!res.ok) throw await readError(res, "Submission");
  const { task_id } = await res.json();
  return pollIngestTask(task_id);
}

export function exampleDownloadUrl(key: string): string {
  return `${apiV3Prefix}/columns/examples/download?key=${encodeURIComponent(key)}`;
}

export async function listExamples(): Promise<
  { key: string; filename: string; size: number }[]
> {
  const res = await fetch(`${apiV3Prefix}/columns/examples`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const body = await res.json();
  return body.examples ?? [];
}
