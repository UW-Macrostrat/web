/**
 * Client-side feedback persistence and permissions.
 *
 * Saving writes the graph first, then optionally writes notes and categories
 * through PostgREST. These requests are not one atomic transaction.
 */
import {
  knowledgeGraphAPIURL,
  postgrestPrefix,
} from "@macrostrat-web/settings";
import { treeToGraph, type TreeData } from "@macrostrat/feedback-components";
import type { KGFeedbackType } from "./types";

export interface FeedbackNotes {
  note: string;
  types: KGFeedbackType[];
}

export const EMPTY_FEEDBACK_NOTES: FeedbackNotes = {
  note: "",
  types: [],
};

export interface SaveFeedbackArgs {
  /** The edited entity tree from FeedbackComponent's onSave. */
  tree: TreeData[];
  sourceTextId: number;
  /** The runs this feedback corrects. */
  supersedesRunIds: number[];
  modelId: number;
  versionId: number | null;
  notes: FeedbackNotes;
}

export interface FeedbackAccess {
  user_id: string;
  is_admin: boolean;
  scope: "owned_feedback" | "all_feedback";
  run_ids: number[] | null;
}

interface RequestOptions {
  method: "GET" | "POST" | "DELETE" | "PUT";
  body?: unknown;
  headers?: Record<string, string>;
}

export class FeedbackRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FeedbackRequestError";
  }
}

/** Overwrites use the same graph payload as regular feedback saves. */
export type FeedbackReplacement = ReturnType<typeof treeToGraph>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseId(value: unknown, label: string): number {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : NaN;

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}`);
  }

  return id;
}

/** Shared transport for the graph API and PostgREST. No automatic retries. */
async function requestJSON(
  url: string,
  { method, body, headers = {} }: RequestOptions,
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const responseText = await res.text();
  let result: unknown = null;
  let validJSON = true;

  if (responseText.trim()) {
    try {
      result = JSON.parse(responseText);
    } catch {
      validJSON = false;
    }
  }

  if (!res.ok) {
    const detail = isRecord(result)
      ? result.detail ?? result.message
      : undefined;

    const message =
      typeof detail === "string"
        ? detail
        : detail != null
          ? JSON.stringify(detail)
          : res.statusText || "Request failed";

    throw new FeedbackRequestError(
      `${message} (HTTP ${res.status})`,
      res.status,
    );
  }

  if (!validJSON) {
    throw new Error(
      "The server returned invalid JSON. The operation may have completed.",
    );
  }

  return result;
}

function feedbackRequest(
  path: string,
  method: RequestOptions["method"],
  body?: unknown,
): Promise<unknown> {
  return requestJSON(
    `${knowledgeGraphAPIURL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
    { method, body },
  );
}

export function hasFeedbackNotes(notes: FeedbackNotes): boolean {
  return notes.note.trim().length > 0 || notes.types.length > 0;
}

/**
 * Save a new feedback run, then attach any notes.
 *
 * treeToGraph can emit multiple spans per node. The current record_run
 * implementation persists only the first span.
 */
export async function saveFeedback(args: SaveFeedbackArgs): Promise<number> {
  const { nodes, edges } = treeToGraph(args.tree);

  const runId = await recordRun({
    nodes,
    edges,
    sourceTextId: args.sourceTextId,
    supersedesRunIds: args.supersedesRunIds,
    model_id: args.modelId,
    version_id: args.versionId,
  });

  if (hasFeedbackNotes(args.notes)) {
    try {
      await attachNotes(runId, args.notes);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Feedback run ${runId} was saved, but saving its notes failed: ${detail}`,
      );
    }
  }

  return runId;
}

async function recordRun(body: Record<string, unknown>): Promise<number> {
  const result = await feedbackRequest("/record_run", "POST", body);

  if (!isRecord(result) || !isRecord(result.data)) {
    throw new Error("The knowledge-graph API did not return a run ID");
  }

  return parseId(result.data.table_id, "run ID returned by the API");
}

/** Fetch permissions when loading the page; refresh after relevant changes. */
export async function getFeedbackAccess(): Promise<FeedbackAccess> {
  const body = await feedbackRequest("/feedback_runs/access", "GET");

  if (
    !isRecord(body) ||
    typeof body.user_id !== "string" ||
    typeof body.is_admin !== "boolean"
  ) {
    throw new Error("Invalid feedback access response");
  }

  if (body.is_admin && body.scope === "all_feedback") {
    return {
      user_id: body.user_id,
      is_admin: true,
      scope: "all_feedback",
      run_ids: null,
    };
  }

  if (
    body.is_admin ||
    body.scope !== "owned_feedback" ||
    !Array.isArray(body.run_ids)
  ) {
    throw new Error("Invalid feedback access response");
  }

  return {
    user_id: body.user_id,
    is_admin: false,
    scope: "owned_feedback",
    run_ids: body.run_ids.map((id) => parseId(id, "accessible run ID")),
  };
}

/**
 * UI permission check for feedback runs.
 * The API independently rechecks permissions on every write.
 */
export function hasFeedbackAccess(
  access: FeedbackAccess | null | undefined,
  runId: number,
): boolean {
  if (!access || !Number.isSafeInteger(runId) || runId <= 0) {
    return false;
  }

  return (
    (access.is_admin && access.scope === "all_feedback") ||
    (access.scope === "owned_feedback" &&
      access.run_ids?.includes(runId) === true)
  );
}

/** Delete a feedback run. Database references may still cause a 409 response. */
export async function deleteFeedback(runId: number): Promise<void> {
  parseId(runId, "feedback run ID");
  await feedbackRequest(`/feedback_runs/${runId}`, "DELETE");
}

/** Replace an existing review's graph, preserving its run ID and notes. */
export async function overwriteFeedback(
  runId: number,
  tree: TreeData[],
): Promise<number> {
  parseId(runId, "feedback run ID");
  const { nodes, edges } = treeToGraph(tree);
  const payload: FeedbackReplacement = { nodes, edges };
  await feedbackRequest(`/feedback_runs/${runId}`, "PUT", payload);
  return runId;
}

async function postRows(
  view: string,
  rows: object[],
): Promise<unknown[]> {
  const result = await requestJSON(
    `${postgrestPrefix.replace(/\/+$/, "")}/${view}`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: rows,
    },
  );

  if (!Array.isArray(result)) {
    throw new Error(`Saving to ${view} did not return rows`);
  }

  return result;
}

async function attachNotes(
  runId: number,
  notes: FeedbackNotes,
): Promise<void> {
  const [noteRow] = await postRows("extraction_feedback", [
    { feedback_id: runId, custom_note: notes.note },
  ]);

  if (!isRecord(noteRow) || noteRow.note_id == null) {
    throw new Error("Saving the feedback note did not return an ID");
  }

  const noteId = noteRow.note_id;

  if (notes.types.length === 0) return;

  await postRows(
    "lookup_extraction_type",
    notes.types.map((type) => ({
      note_id: noteId,
      type_id: type.type_id,
    })),
  );
}
