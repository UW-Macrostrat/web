/** Loaders for the knowledge-graph PostgREST views. Plain async functions with
 * no React or browser dependencies, so the same call runs in a server `+data`
 * hook or in a client effect (the pattern established for `/lex`, see
 * `~/components/lex/data-loaders`). */
import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "cross-fetch";
import type {
  KGEntityType,
  KGFeedbackNote,
  KGFeedbackType,
  KGModel,
  KGPublication,
  KGRun,
  KGSourceText,
} from "./types";

/** Query a PostgREST view and return its rows. Throws on a non-2xx response,
 * surfacing PostgREST's error message rather than silently yielding `[]`. */
export async function fetchKGRows<T = any>(
  view: string,
  params: Record<string, string | number | null | undefined> = {}
): Promise<T[]> {
  const url = new URL(`${postgrestPrefix}/${view}`);
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString());
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: a proxy or gateway error page. Reported below.
  }
  if (!res.ok || body == null) {
    const message = body?.message ?? body?.error ?? res.statusText;
    throw new Error(`PostgREST ${view}: ${res.status} ${message}`);
  }
  if (!Array.isArray(body)) return [];
  return body as T[];
}

/** Index rows by id. Loaders return plain arrays (they cross the server→client
 * boundary as page data); components build the lookup maps they need. */
export function indexById<T extends { id: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((d) => [d.id, d]));
}

export async function fetchModels(): Promise<KGModel[]> {
  return fetchKGRows<KGModel>("kg_model", { order: "id" });
}

export async function fetchEntityTypes(): Promise<KGEntityType[]> {
  return fetchKGRows<KGEntityType>("kg_entity_type", { order: "id" });
}

export interface KGLookups {
  models: KGModel[];
  entityTypes: KGEntityType[];
}

/** The lookups every extraction view needs: model names and entity-type colors. */
export async function fetchKGLookups(): Promise<KGLookups> {
  const [models, entityTypes] = await Promise.all([
    fetchModels(),
    fetchEntityTypes(),
  ]);
  return { models, entityTypes };
}

/** Columns of `kg_publication_entities` that are cheap to fetch. The view's
 * `entities` column aggregates every entity tree for the paper and must not
 * be selected for lists. */
export const PUBLICATION_COLUMNS = "paper_id,citation,n_matches,models";

export async function fetchPublication(
  paperId: string
): Promise<KGPublication | null> {
  const rows = await fetchKGRows<KGPublication>("kg_publication_entities", {
    select: PUBLICATION_COLUMNS,
    paper_id: `eq.${paperId}`,
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function fetchSourceText(
  id: number
): Promise<KGSourceText | null> {
  const rows = await fetchKGRows<KGSourceText>("kg_source_text", {
    id: `eq.${id}`,
    limit: 1,
  });
  return rows[0] ?? null;
}

export type RunKind = "model" | "human" | "all";

interface RunFilter {
  sourceTextId?: number;
  paperId?: string;
  /** Model runs have no `user_id`; human feedback runs carry the reviewer's id. */
  kind?: RunKind;
  /** Only runs with a positive `version_id`. Feedback is recorded against a
   * model version, so runs without one cannot be superseded by a correction. */
  requireVersion?: boolean;
}

/** Runs (entity trees) from `kg_context_entities` for a source text or a paper.
 * Rows with a null `model_run` are source texts that have never been run and
 * carry no entities; they are dropped. */
export async function fetchRuns(filter: RunFilter): Promise<KGRun[]> {
  const params: Record<string, string> = { order: "model_run" };
  if (filter.sourceTextId != null) {
    params.source_text = `eq.${filter.sourceTextId}`;
  }
  if (filter.paperId != null) {
    params.paper_id = `eq.${filter.paperId}`;
  }
  if (filter.kind === "model") {
    params.user_id = "is.null";
  } else if (filter.kind === "human") {
    params.user_id = "not.is.null";
  }
  if (filter.requireVersion) {
    params.version_id = "gt.0";
  }
  const rows = await fetchKGRows<KGRun>("kg_context_entities", params);
  return rows.filter((d) => d.model_run != null);
}

export interface AdjacentSourceTexts {
  previous: number | null;
  next: number | null;
}

/** Neighboring source-text ids, for stepping through the review queue. */
export async function fetchAdjacentSourceTexts(
  id: number
): Promise<AdjacentSourceTexts> {
  const [prev, next] = await Promise.all([
    fetchKGRows<{ id: number }>("kg_source_text", {
      select: "id",
      id: `lt.${id}`,
      order: "id.desc",
      limit: 1,
    }),
    fetchKGRows<{ id: number }>("kg_source_text", {
      select: "id",
      id: `gt.${id}`,
      order: "id.asc",
      limit: 1,
    }),
  ]);
  return { previous: prev[0]?.id ?? null, next: next[0]?.id ?? null };
}

export async function fetchFeedbackTypes(): Promise<KGFeedbackType[]> {
  return fetchKGRows<KGFeedbackType>("extraction_feedback_type", {
    order: "type_id",
  });
}

/** Notes and categories attached to a human feedback run. */
export async function fetchFeedbackNotes(
  runId: number
): Promise<KGFeedbackNote | null> {
  const rows = await fetchKGRows<KGFeedbackNote>(
    "extraction_feedback_combined",
    { feedback_id: `eq.${runId}` }
  );
  return rows[0] ?? null;
}

/** Notes for several feedback runs at once, keyed by run id. */
export async function fetchFeedbackNotesForRuns(
  runIds: number[]
): Promise<Map<number, KGFeedbackNote>> {
  if (runIds.length === 0) return new Map();
  const rows = await fetchKGRows<KGFeedbackNote>(
    "extraction_feedback_combined",
    { feedback_id: `in.(${runIds.join(",")})` }
  );
  return new Map(rows.map((d) => [d.feedback_id, d]));
}

/** Number of human feedback runs recorded for a source text. */
export async function countHumanRuns(sourceTextId: number): Promise<number> {
  const rows = await fetchKGRows<{ model_run: number }>(
    "kg_context_entities",
    {
      select: "model_run",
      source_text: `eq.${sourceTextId}`,
      user_id: "not.is.null",
    }
  );
  return rows.filter((d) => d.model_run != null).length;
}
