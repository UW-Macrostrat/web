/** What the ingestion pipeline said about this column, and the dataset's
 * facies scheme.
 *
 * Both arrive with a column opened from a dry run (`../data`) and are
 * refreshed when the editor submits the column for checking. Notices are
 * the pipeline's graded findings — they complement the sheets' own cell
 * validation, which is immediate but knows nothing about the database. */
import { atom } from "jotai";
import type { FaciesDef, IngestNotice, IngestResult } from "../ingest-api";

export const noticesAtom = atom<IngestNotice[]>([]);

/** The last submission's result, so the toolbar can say what happened. */
export const lastIngestResultAtom = atom<IngestResult | null>(null);

export type SubmissionPhase = "idle" | "working" | "done" | "error";

export const submissionPhaseAtom = atom<SubmissionPhase>("idle");
export const submissionErrorAtom = atom<string | null>(null);

export const noticeCountsAtom = atom((get) => {
  const counts = { info: 0, warning: 0, error: 0 };
  for (const notice of get(noticesAtom)) counts[notice.level] += 1;
  return counts;
});

/* ------------------------------------------------------------------ facies */

export const faciesSchemeAtom = atom<FaciesDef[]>([]);

/** The scheme by lower-cased id and name, for reading a unit's `facies` text. */
export type FaciesIndex = Map<string, FaciesDef>;

export const faciesIndexAtom = atom<FaciesIndex>((get) => {
  const index: FaciesIndex = new Map();
  for (const def of get(faciesSchemeAtom)) {
    index.set(normalizeFaciesKey(def.facies_id), def);
    const byName = normalizeFaciesKey(def.facies);
    if (!index.has(byName)) index.set(byName, def);
  }
  return index;
});

export function normalizeFaciesKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}
