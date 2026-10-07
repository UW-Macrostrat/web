/** Editing the compilation graph: a local draft, applied in one save.
 *
 * Every gesture — a drag, a removal, a flipped switch — changes the draft and
 * nothing else. The tree draws the graph with the draft laid over it, so what is
 * on screen is what a save would write; the save sends the draft to api-v3's
 * `PATCH /compilations` as one transaction, since a move is two edits and half
 * of one is a map in both places or in neither.
 *
 * Member lists are always built from the *whole* graph, never the point-scoped
 * one the tree may be showing: a point graph holds only the members covering
 * the point, and a list rebuilt from it would drop the rest.
 *
 * Priorities are tiers, not a total order. Most members of a scale layer share a
 * priority (`large` has 249 members in five), and ties are settled by depth and
 * area — so a drag moves a map between tiers, or into a new one, and never
 * renumbers the maps it did not touch.
 */

import { apiV3Prefix } from "@macrostrat-web/settings";
import { atom, type Atom, type PrimitiveAtom, type WritableAtom } from "jotai";

import type { CompilationGraph, GraphEdge, GraphNode } from "./graph";

/** The authored properties a draft can change on a source. `assembly_mode` is
 * not one of them: it is fixed by how the compilation's contents were built (a
 * mosaic's members hold no polygons; a multiscale compilation's are
 * alternatives by zoom), so changing it is restructuring, done on the CLI. */
export interface NodeEdit {
  name?: string;
  is_served?: boolean;
}

export interface Draft {
  /** Complete member lists, by compilation, for every compilation touched. */
  members: Map<number, GraphEdge[]>;
  properties: Map<number, NodeEdit>;
}

export const emptyDraft: Draft = { members: new Map(), properties: new Map() };

/** A map being dragged, and the compilation it is being dragged out of (null
 * for a root or a standalone map, which a drop adds rather than moves). */
export interface DragItem {
  member_id: number;
  from: number | null;
}

/** Where a drop lands in a compilation: an existing tier, a new tier in the gap
 * between two (either side may be open), or wherever the compilation's mode
 * puts a new member. */
export type DropTarget =
  | { compilation_id: number; kind: "tier"; priority: number | null }
  | {
      compilation_id: number;
      kind: "gap";
      above: number | null;
      below: number | null;
    }
  | { compilation_id: number; kind: "into" };

export interface Drop {
  item: DragItem;
  target: DropTarget;
  /** Keep the map where it was as well (the Alt/Option key). */
  copy: boolean;
}

export interface EdgeChange {
  kind: "added" | "removed" | "reprioritized";
  compilation: GraphNode;
  member: GraphNode;
  priority: number | null;
  previous: number | null;
}

export interface PropertyChange {
  kind: "property";
  node: GraphNode;
  field: keyof NodeEdit;
  value: string | boolean;
  previous: string | boolean | null;
}

export type Change = EdgeChange | PropertyChange;

export interface CompilationEditAtoms {
  editing: PrimitiveAtom<boolean>;
  draft: PrimitiveAtom<Draft>;
  dragging: PrimitiveAtom<DragItem | null>;
  /** Refusals from the last gesture — a drop that would make a cycle. */
  notice: PrimitiveAtom<string | null>;
  /** Set by a save, cleared by hand: the edges changed, but nothing downstream
   * has been rebuilt. */
  needsTopoUpdate: PrimitiveAtom<boolean>;
  changes: Atom<Change[]>;
  drop: WritableAtom<null, [Drop], void>;
  removeMember: WritableAtom<null, [number, number], void>;
  setProperty: WritableAtom<null, [number, NodeEdit], void>;
  addMember: WritableAtom<null, [number, number], void>;
  discard: WritableAtom<null, [], void>;
}

/** Edit state over a page's whole graph. */
export function compilationEditAtoms(
  graph: Atom<CompilationGraph>
): CompilationEditAtoms {
  const editing = atom(false);
  const draft = atom<Draft>(emptyDraft);
  const dragging = atom<DragItem | null>(null);
  const notice = atom<string | null>(null);
  const needsTopoUpdate = atom(false);

  const changes = atom<Change[]>((get) => diffDraft(get(graph), get(draft)));

  const drop = atom(null, (get, set, value: Drop) => {
    const base = get(graph);
    const current = get(draft);
    const result = applyDrop(base, current, value);
    if (typeof result === "string") {
      set(notice, result);
      return;
    }
    set(notice, null);
    set(draft, result);
  });

  const removeMember = atom(
    null,
    (get, set, compilationId: number, memberId: number) => {
      const base = get(graph);
      const current = get(draft);
      const list = membersOf(base, current, compilationId).filter(
        (e) => e.member_id !== memberId
      );
      set(draft, withMembers(base, current, compilationId, list));
    }
  );

  /** Add at the top of a compilation, as a drop onto its row does. */
  const addMember = atom(
    null,
    (get, set, compilationId: number, memberId: number) => {
      set(drop, {
        item: { member_id: memberId, from: null },
        target: { compilation_id: compilationId, kind: "into" },
        copy: true,
      });
    }
  );

  const setProperty = atom(
    null,
    (get, set, sourceId: number, edit: NodeEdit) => {
      const node = get(graph).nodes.find((n) => n.source_id === sourceId);
      if (node == null) return;
      const current = get(draft);
      const merged: NodeEdit = { ...current.properties.get(sourceId), ...edit };

      // A value set back to what the database holds is no longer a change.
      for (const field of Object.keys(merged) as (keyof NodeEdit)[]) {
        if (merged[field] === baseValue(node, field)) delete merged[field];
      }

      const properties = new Map(current.properties);
      if (Object.keys(merged).length === 0) {
        properties.delete(sourceId);
      } else {
        properties.set(sourceId, merged);
      }
      set(draft, { ...current, properties });
    }
  );

  const discard = atom(null, (get, set) => {
    set(draft, emptyDraft);
    set(notice, null);
  });

  return {
    editing,
    draft,
    dragging,
    notice,
    needsTopoUpdate,
    changes,
    drop,
    removeMember,
    setProperty,
    addMember,
    discard,
  };
}

/* ------------------------------------------------------ the draft, applied */

/** A graph with a draft laid over it.
 *
 * Works on the point-scoped graph as well as the whole one. A drafted member
 * list is always complete, so its length is the compilation's true member count
 * either way; everything the draft did not touch keeps the counts the API gave
 * it, which a point graph's pruned edges could not reproduce. */
export function applyDraft(
  graph: CompilationGraph,
  draft: Draft
): CompilationGraph {
  if (draft.members.size === 0 && draft.properties.size === 0) return graph;

  const nodeIds = new Set(graph.nodes.map((n) => n.source_id));
  const edges: GraphEdge[] = graph.edges.filter(
    (e) => !draft.members.has(e.compilation_id)
  );
  // Every node whose membership the draft changes, on either side of an edge.
  const affected = new Set<number>(draft.properties.keys());
  for (const e of graph.edges) {
    if (draft.members.has(e.compilation_id)) affected.add(e.member_id);
  }
  for (const [compilationId, list] of draft.members) {
    affected.add(compilationId);
    for (const e of list) affected.add(e.member_id);
    // An edge to a node outside the point graph has nothing to draw.
    edges.push(...list.filter((e) => nodeIds.has(e.member_id)));
  }

  const linked = new Set<number>();
  for (const e of edges) {
    linked.add(e.compilation_id);
    linked.add(e.member_id);
  }

  const nodes = graph.nodes.map((node) => {
    if (!affected.has(node.source_id)) return node;
    const n_members =
      draft.members.get(node.source_id)?.length ?? node.n_members;
    return {
      ...node,
      ...draft.properties.get(node.source_id),
      n_members,
      is_compilation: n_members > 0,
      is_standalone: !linked.has(node.source_id),
    };
  });

  return { nodes, edges: sortEdges(edges) };
}

/** The order the API returns them in, which the tree relies on: highest
 * priority first within each compilation. */
function sortEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort((a, b) => {
    if (a.compilation_id !== b.compilation_id) {
      return a.compilation_id - b.compilation_id;
    }
    const pa = a.priority ?? -Infinity;
    const pb = b.priority ?? -Infinity;
    if (pa !== pb) return pb - pa;
    return a.member_id - b.member_id;
  });
}

/** A compilation's members as the draft has them. */
export function membersOf(
  graph: CompilationGraph,
  draft: Draft,
  compilationId: number
): GraphEdge[] {
  return (
    draft.members.get(compilationId) ??
    graph.edges.filter((e) => e.compilation_id === compilationId)
  );
}

/** A draft with one compilation's member list replaced — or dropped from the
 * draft, when the list is back to what the database holds. */
function withMembers(
  graph: CompilationGraph,
  draft: Draft,
  compilationId: number,
  list: GraphEdge[]
): Draft {
  const members = new Map(draft.members);
  const original = graph.edges.filter(
    (e) => e.compilation_id === compilationId
  );
  if (sameMembers(original, list)) {
    members.delete(compilationId);
  } else {
    members.set(compilationId, list);
  }
  return { ...draft, members };
}

function sameMembers(a: GraphEdge[], b: GraphEdge[]) {
  if (a.length !== b.length) return false;
  const byId = new Map(a.map((e) => [e.member_id, e.priority]));
  return b.every(
    (e) => byId.has(e.member_id) && byId.get(e.member_id) === e.priority
  );
}

/* ----------------------------------------------------------------- a drop */

/** The draft after a drop, or the reason it was refused. */
export function applyDrop(
  graph: CompilationGraph,
  draft: Draft,
  { item, target, copy }: Drop
): Draft | string {
  const to = target.compilation_id;
  const memberId = item.member_id;

  if (memberId === to || isAncestor(graph, draft, memberId, to)) {
    return "A compilation cannot contain itself, directly or through its members.";
  }

  const mode = assemblyModeOf(graph, to);
  let list = membersOf(graph, draft, to).filter(
    (e) => e.member_id !== memberId
  );

  let priority: number | null = null;
  if (mode === "topological") {
    const placed = placeInTiers(list, target);
    list = placed.members;
    priority = placed.priority;
  }
  list = [...list, { compilation_id: to, member_id: memberId, priority }];

  let next = withMembers(graph, draft, to, list);

  const from = item.from;
  if (from != null && from !== to && !copy) {
    const fromList = membersOf(graph, next, from).filter(
      (e) => e.member_id !== memberId
    );
    next = withMembers(graph, next, from, fromList);
  }

  if (from !== to) {
    next = reparent(graph, next, to, memberId);
    next = absorb(graph, next, to, memberId);
  }
  return next;
}

/** The other direction: a compilation placed in `compilationId` stands there
 * for its own members, so the direct edges `compilationId` held to any of
 * them are withdrawn -- `bc-surface` dropped into `large` replaces `large`'s
 * own edges to `bc_2017` and `bc_2017_quat`. Left in place they would be
 * placed twice over, which `compilations lint` reports. */
function absorb(
  graph: CompilationGraph,
  draft: Draft,
  compilationId: number,
  memberId: number
): Draft {
  const below = descendantsOf(graph, draft, memberId);
  if (below.size === 0) return draft;
  const list = membersOf(graph, draft, compilationId);
  const kept = list.filter((e) => !below.has(e.member_id));
  if (kept.length === list.length) return draft;
  return withMembers(graph, draft, compilationId, kept);
}

function descendantsOf(
  graph: CompilationGraph,
  draft: Draft,
  id: number
): Set<number> {
  const found = new Set<number>();
  const queue = [id];
  while (queue.length > 0) {
    const next = queue.shift()!;
    for (const e of membersOf(graph, draft, next)) {
      if (found.has(e.member_id)) continue;
      found.add(e.member_id);
      queue.push(e.member_id);
    }
  }
  return found;
}

/** The CLI's reparenting, done in the draft so it shows before the save: a map
 * placed in a compilation stands in that compilation's parents *through* it,
 * so a direct edge from one of those parents is withdrawn. */
function reparent(
  graph: CompilationGraph,
  draft: Draft,
  compilationId: number,
  memberId: number
): Draft {
  let next = draft;
  const parents = parentsOf(graph, draft, compilationId);
  for (const parent of parents) {
    const list = membersOf(graph, next, parent);
    if (!list.some((e) => e.member_id === memberId)) continue;
    next = withMembers(
      graph,
      next,
      parent,
      list.filter((e) => e.member_id !== memberId)
    );
  }
  return next;
}

function parentsOf(
  graph: CompilationGraph,
  draft: Draft,
  id: number
): number[] {
  return allCompilationIds(graph, draft).filter((c) =>
    membersOf(graph, draft, c).some((e) => e.member_id === id)
  );
}

function allCompilationIds(graph: CompilationGraph, draft: Draft): number[] {
  const ids = new Set(graph.edges.map((e) => e.compilation_id));
  for (const id of draft.members.keys()) ids.add(id);
  return [...ids];
}

/** Whether `candidate` sits above `id` — adding it as a member would close a
 * cycle, which the database refuses anyway. */
function isAncestor(
  graph: CompilationGraph,
  draft: Draft,
  candidate: number,
  id: number
): boolean {
  const seen = new Set<number>();
  const queue = [id];
  while (queue.length > 0) {
    const next = queue.shift()!;
    for (const parent of parentsOf(graph, draft, next)) {
      if (parent === candidate) return true;
      if (seen.has(parent)) continue;
      seen.add(parent);
      queue.push(parent);
    }
  }
  return false;
}

export function assemblyModeOf(graph: CompilationGraph, id: number): string {
  const node = graph.nodes.find((n) => n.source_id === id);
  return node?.assembly_mode ?? "topological";
}

/* ------------------------------------------------------------------ tiers */

/** A compilation's members grouped by priority, highest first. */
export function tiersOf<T extends { edge: GraphEdge }>(
  rows: T[]
): { priority: number | null; rows: T[] }[] {
  const tiers = new Map<number | null, T[]>();
  for (const row of rows) {
    const list = tiers.get(row.edge.priority) ?? [];
    list.push(row);
    tiers.set(row.edge.priority, list);
  }
  return [...tiers.entries()]
    .sort(([a], [b]) => (b ?? -Infinity) - (a ?? -Infinity))
    .map(([priority, rows]) => ({ priority, rows }));
}

/** The priority a drop lands at, shifting higher tiers up by one when a new
 * tier has to fit between two adjacent integers. */
function placeInTiers(
  members: GraphEdge[],
  target: DropTarget
): { members: GraphEdge[]; priority: number | null } {
  const priorities = members
    .map((e) => e.priority)
    .filter((p): p is number => p != null);

  if (target.kind === "tier") return { members, priority: target.priority };

  if (priorities.length === 0) return { members, priority: 1 };
  const max = Math.max(...priorities);
  const min = Math.min(...priorities);

  // Dropping on the compilation itself puts the map on top: a map added to a
  // compilation is usually the more detailed one.
  if (target.kind === "into") return { members, priority: max + 1 };

  const { above, below } = target;
  if (above == null && below == null) return { members, priority: max + 1 };
  if (above == null) return { members, priority: max + 1 };
  if (below == null) return { members, priority: min - 1 };

  if (above - below >= 2) {
    return { members, priority: Math.floor((above + below) / 2) };
  }

  // No integer between the two tiers: make room by lifting every tier from
  // `above` up, which keeps every relative order as it was.
  const shifted = members.map((e) => {
    if (e.priority == null || e.priority < above) return e;
    return { ...e, priority: e.priority + 1 };
  });
  return { members: shifted, priority: above };
}

/* ------------------------------------------------------------------ diffs */

function baseValue(node: GraphNode, field: keyof NodeEdit) {
  if (field === "name") return node.name ?? "";
  return node[field];
}

export function diffDraft(graph: CompilationGraph, draft: Draft): Change[] {
  const byId = new Map(graph.nodes.map((n) => [n.source_id, n]));
  const changes: Change[] = [];

  for (const [compilationId, list] of draft.members) {
    const compilation = byId.get(compilationId);
    if (compilation == null) continue;
    const before = new Map(
      graph.edges
        .filter((e) => e.compilation_id === compilationId)
        .map((e) => [e.member_id, e.priority])
    );
    const after = new Map(list.map((e) => [e.member_id, e.priority]));

    for (const [memberId, previous] of before) {
      const member = byId.get(memberId);
      if (member == null) continue;
      if (!after.has(memberId)) {
        changes.push({
          kind: "removed",
          compilation,
          member,
          priority: null,
          previous,
        });
      } else if (after.get(memberId) !== previous) {
        changes.push({
          kind: "reprioritized",
          compilation,
          member,
          priority: after.get(memberId)!,
          previous,
        });
      }
    }
    for (const [memberId, priority] of after) {
      const member = byId.get(memberId);
      if (member == null || before.has(memberId)) continue;
      changes.push({
        kind: "added",
        compilation,
        member,
        priority,
        previous: null,
      });
    }
  }

  for (const [sourceId, edit] of draft.properties) {
    const node = byId.get(sourceId);
    if (node == null) continue;
    for (const field of Object.keys(edit) as (keyof NodeEdit)[]) {
      changes.push({
        kind: "property",
        node,
        field,
        value: edit[field]!,
        previous: baseValue(node, field) ?? null,
      });
    }
  }

  return changes;
}

/* ------------------------------------------------------------------- save */

export interface SaveProblem {
  compilation: string;
  member: string;
  reason: string;
}

/** Refused by the checks, with the reasons — the caller may retry with force. */
export class SaveRefused extends Error {
  problems: SaveProblem[];
  constructor(message: string, problems: SaveProblem[]) {
    super(message);
    this.problems = problems;
  }
}

/** Send the draft as one batch. Resolves with the API's record of what changed. */
export async function saveDraft(draft: Draft, force = false) {
  const ids = new Set([...draft.members.keys(), ...draft.properties.keys()]);
  const edits = [...ids].map((source_id) => {
    let members = undefined;
    const list = draft.members.get(source_id);
    if (list != null) {
      members = list.map((e) => ({
        member_id: e.member_id,
        priority: e.priority,
      }));
    }
    return { source_id, members, ...draft.properties.get(source_id) };
  });

  const res = await fetch(`${apiV3Prefix}/compilations`, {
    method: "PATCH",
    // The admin check is on the session cookie, which a cross-origin request
    // drops unless it is asked for explicitly.
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edits, force }),
  });

  if (res.ok) return await res.json();

  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (res.status === 409 && Array.isArray(detail?.problems)) {
    throw new SaveRefused(detail.message, detail.problems);
  }
  let message = res.statusText;
  if (typeof detail === "string") message = detail;
  throw new Error(`${res.status}: ${message}`);
}
