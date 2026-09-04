/** Persisting a feedback run. Client-only: it imports the feedback component
 * library and talks to the knowledge-graph API from the browser.
 *
 * Saving is a three-step write across two services:
 *  1. `POST {knowledgeGraphAPIURL}/record_run` stores the corrected entity
 *     graph as a new `model_run` superseding the reviewed run(s) and returns
 *     its id;
 *  2. `POST {postgrestPrefix}/extraction_feedback` attaches the reviewer's
 *     free-text note to that run;
 *  3. `POST {postgrestPrefix}/lookup_extraction_type` links the chosen
 *     feedback categories to the note.
 * Steps 2–3 are skipped when the reviewer left no note and chose no category. */
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

export const EMPTY_FEEDBACK_NOTES: FeedbackNotes = { note: "", types: [] };

export function hasFeedbackNotes(notes: FeedbackNotes): boolean {
  return notes.note.trim().length > 0 || notes.types.length > 0;
}

export interface SaveFeedbackArgs {
  /** The edited entity tree from `FeedbackComponent`'s `onSave`. */
  tree: TreeData[];
  sourceTextId: number;
  /** The run(s) this feedback corrects. */
  supersedesRunIds: number[];
  modelId: number;
  versionId: number | null;
  notes: FeedbackNotes;
}

/** Save a feedback run and its notes; resolves to the new run id. */
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
    await attachNotes(runId, args.notes);
  }
  return runId;
}

async function recordRun(body: Record<string, any>): Promise<number> {
  const res = await fetch(`${knowledgeGraphAPIURL}/record_run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Send the session cookie so the API can attribute the run to the reviewer
    // when it is served from the same origin (or allows credentials).
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Could not record the feedback run (${res.status} ${res.statusText})`
    );
  }
  const result = await res.json();
  const runId = result?.data?.table_id;
  if (runId == null) {
    throw new Error("The knowledge-graph API did not return a run id");
  }
  return runId;
}

async function postRows<T = any>(view: string, rows: object[]): Promise<T[]> {
  const res = await fetch(`${postgrestPrefix}/${view}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    credentials: "include",
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.message ?? detail;
    } catch {
      // A non-JSON error body: keep the status text.
    }
    throw new Error(`Could not save to ${view}: ${detail}`);
  }
  return res.json();
}

async function attachNotes(runId: number, notes: FeedbackNotes) {
  const [noteRow] = await postRows<{ note_id: number }>(
    "extraction_feedback",
    [{ feedback_id: runId, custom_note: notes.note }]
  );
  const noteId = noteRow?.note_id;
  if (noteId == null) {
    throw new Error("Saving the feedback note did not return an id");
  }
  if (notes.types.length === 0) return;
  await postRows(
    "lookup_extraction_type",
    notes.types.map((t) => ({ note_id: noteId, type_id: t.type_id }))
  );
}
