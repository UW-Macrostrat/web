/**
 * Pending-operations model (page-side).
 *
 * The single source of truth for unsaved changes is an ordered stack of
 * `PendingOp`s. The table's edit overlay is a pure derivation:
 *
 *     { updatedData, rowStatus } = applyOps(loadedRows, ops)
 *
 * Ops are revertible (remove one, or clear all), apply to rows loaded later
 * (so column copies / omits behave as all-rows "rules"), and flush to the API
 * on Save. Inline cell edits made through data-sheet are captured back into the
 * stack as `setCell` ops (see `diffToOps`), keeping the stack authoritative.
 *
 * This is deliberately self-contained so it can later move behind a
 * `@macrostrat/data-sheet` op-based edit API (`onEdit(op)` + controlled
 * overlay) without changing its shape.
 */
import { atom } from "jotai";
import { Filter, rowPassesFilters, submitChange, type DataParameters } from "../utils";
import { submitColumnCopy, toBoolean } from "../components";

let _opId = 0;
const nextId = () => `op-${++_opId}`;

let _batchId = 0;
/** A new batch id — ops created by one user action share it so the pending
 * list can group them (e.g. "Set descrip (12)"). */
export const nextBatch = () => `b-${++_batchId}`;

/** A pending change. Applies to the rows matching `match`; sets `column` to a
 * fixed `value`, or copies from `source` column. (Omit/restore are just a
 * `setCell` on the `omit` column.) */
export interface PendingOp {
  id: string;
  /** Groups ops created by a single action (for the pending list). */
  batchId: string;
  /** Rows this op applies to (evaluated with `rowPassesFilters`). */
  match: Record<string, Filter>;
  column: string;
  value?: any;
  source?: string;
  label: string;
}

export const opsAtom = atom<PendingOp[]>([]);

/** First-class row status for omitted rows (a `RowStatusValue` in data-sheet
 * v4.1). Distinct from a staged delete — omit is a view/export flag — so it
 * gets its own styling + row-header treatment rather than the delete look. */
export const OMITTED_STATUS = "omitted";

const isEmpty = (v: any) => v == null || v === "";

/** The identity filter for a row: `_pkid` normally, or the group value when
 * grouped (so a grouped edit fans out over the whole group). */
export function identityMatch(
  row: Record<string, any>,
  group: string | undefined,
): Record<string, Filter> {
  if (group != null) {
    const value = row[group];
    return value == null
      ? { [group]: new Filter(group, "is", "null") }
      : { [group]: new Filter(group, "eq", value) };
  }
  return { _pkid: new Filter("_pkid", "eq", row["_pkid"]) };
}

export function makeCellOp(
  row: Record<string, any>,
  group: string | undefined,
  column: string,
  value: any,
  label?: string,
  batchId: string = nextBatch(),
): PendingOp {
  return {
    id: nextId(),
    batchId,
    match: identityMatch(row, group),
    column,
    value,
    label: label ?? `Set ${column}`,
  };
}

export function makeColumnCopyOp(
  source: string,
  target: string,
  viewFilters: Filter[],
  batchId: string = nextBatch(),
): PendingOp {
  return {
    id: nextId(),
    batchId,
    // Keyed by column so `match` stays a `Record<string, Filter>` (consumed by
    // `applyOps` and the server column-copy on Save).
    match: Object.fromEntries(viewFilters.map((f) => [f.column_name, f])),
    column: target,
    source,
    label: `Copy ${source} → ${target}`,
  };
}

/** Derive the edit overlay + row status from the base rows and the op stack.
 * Ops compose in order (a copy sees prior edits). */
export function applyOps(
  base: any[],
  ops: PendingOp[],
): { updatedData: any[]; rowStatus: any[] } {
  const overlay: any[] = [];
  const mergedAt = (i: number) => ({ ...base[i], ...(overlay[i] ?? {}) });

  for (const op of ops) {
    const filters = Object.values(op.match);
    for (let i = 0; i < base.length; i++) {
      if (base[i] == null) continue;
      const row = mergedAt(i);
      if (!rowPassesFilters(row, filters)) continue;
      const value = op.source != null ? row[op.source] : op.value;
      overlay[i] = { ...(overlay[i] ?? {}), [op.column]: value };
    }
  }

  const rowStatus: any[] = [];
  for (let i = 0; i < base.length; i++) {
    if (base[i] == null) continue;
    if (toBoolean(overlay[i]?.omit ?? base[i]?.omit) === true) {
      rowStatus[i] = OMITTED_STATUS;
    }
  }
  return { updatedData: overlay, rowStatus };
}

/** Translate a data-sheet overlay that has diverged from our derived overlay
 * (i.e. an inline edit) into new `setCell` ops. No-op / empty↔null changes are
 * skipped. */
export function diffToOps(
  current: any[],
  derived: any[],
  base: any[],
  group: string | undefined,
): PendingOp[] {
  const ops: PendingOp[] = [];
  const batchId = nextBatch(); // one user edit / paste → one batch
  for (let i = 0; i < current.length; i++) {
    const cur = current[i];
    if (cur == null) continue;
    const der = derived[i] ?? {};
    const baseRow = base[i];
    if (baseRow == null) continue;
    for (const column of Object.keys(cur)) {
      const value = cur[column];
      if (value === der[column]) continue;
      const baseValue = baseRow[column];
      // Skip phantom empty↔null edits.
      if (value === baseValue || (isEmpty(value) && isEmpty(baseValue))) continue;
      ops.push(makeCellOp(baseRow, group, column, value, undefined, batchId));
    }
  }
  return ops;
}

/** Flush the op stack to the API, in order. Cell/value ops → filter-scoped
 * PATCH; copy ops → server-side whole-column copy. */
export async function saveOps(
  url: string,
  ops: PendingOp[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let done = 0;
  onProgress?.(0, ops.length);
  for (const op of ops) {
    if (op.source != null) {
      const params = { select: {}, filter: op.match } as DataParameters;
      await submitColumnCopy(url, op.source, op.column, params);
    } else {
      await submitChange(url, op.value, [op.column], op.match);
    }
    done += 1;
    onProgress?.(done, ops.length);
  }
  return ops.length;
}
