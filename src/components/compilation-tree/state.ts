/** Derived state for a compilation tree.
 *
 * A factory rather than module-level atoms: each page brings its own graph and
 * its own idea of what is selected — the compilations browser reads both from
 * the URL, the topology page fetches the graph on the client — and the derived
 * work below is identical either way. Atoms are scoped per instance so two trees
 * never share a search box.
 */

import { atom, type Atom, type PrimitiveAtom, type WritableAtom } from "jotai";

import {
  emptyGraph,
  type CompilationGraph,
  type GraphEdge,
  type GraphNode,
} from "./graph";

/** What a page supplies: the graph to show, and the slug it considers selected.
 * The focus atom is writable because selecting a node is the tree's one side
 * effect — usually an atom over a URL parameter. */
export interface CompilationTreeSource {
  graph: Atom<CompilationGraph>;
  focusSlug: WritableAtom<string | null, [string | null], unknown>;
}

export interface CompilationTreeAtoms extends CompilationTreeSource {
  /** Free text over slug, name and id. */
  searchText: PrimitiveAtom<string>;
  /** Scale bands to keep. Empty means all of them. */
  scaleFilter: PrimitiveAtom<string[]>;
  /** List every served compilation as a root, not only the unclaimed ones. */
  servedAtTop: PrimitiveAtom<boolean>;
  nodesById: Atom<Map<number, GraphNode>>;
  /** Members of each compilation, highest priority first. */
  children: Atom<Map<number, GraphEdge[]>>;
  /** Compilations nothing else contains. */
  roots: Atom<GraphNode[]>;
  /** Every node to draw under the current filter, or null when none is active. */
  matchingIds: Atom<Set<number> | null>;
  standaloneNodes: Atom<GraphNode[]>;
  /** Slugs a map should draw, so map and tree agree. Null means draw everything. */
  visibleSlugs: Atom<string[] | null>;
  focusNode: Atom<GraphNode | null>;
  /** The route from a root down to the selection, so the tree can open itself to
   * reveal what is selected. */
  focusPath: Atom<GraphNode[]>;
  focusAncestorIds: Atom<Set<number>>;
  /** Everything below the selection, which the tree opens in full. */
  focusDescendantIds: Atom<Set<number>>;
  /** Where resolution under the selection stops: the maps and materialized
   * compilations whose polygons it is drawn from. */
  focusResolvedIds: Atom<Set<number>>;
}

function nodeMatches(
  node: GraphNode,
  query: string,
  scales: string[]
): boolean {
  if (scales.length > 0 && !scales.includes(node.scale ?? "")) return false;
  if (query === "") return true;
  return (
    node.slug.toLowerCase().includes(query) ||
    (node.name ?? "").toLowerCase().includes(query) ||
    String(node.source_id) === query
  );
}

/** Higher first; an unranked member after every ranked one. */
function byPriorityDesc(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

/** Largest first; a node without bounds last, then by slug. */
function bySize(a: GraphNode | undefined, b: GraphNode | undefined): number {
  const area = (n: GraphNode | undefined) => n?.area_km ?? -1;
  const diff = area(b) - area(a);
  if (diff !== 0) return diff;
  return (a?.slug ?? "").localeCompare(b?.slug ?? "");
}

export function compilationTreeAtoms(
  source: CompilationTreeSource
): CompilationTreeAtoms {
  const { graph, focusSlug } = source;

  const searchText = atom("");
  const scaleFilter = atom<string[]>([]);
  const servedAtTop = atom(false);

  const nodesById = atom<Map<number, GraphNode>>(
    (get) => new Map(get(graph).nodes.map((n) => [n.source_id, n]))
  );

  /** Highest priority first; where priority does not decide -- a tie, or a
   * mosaic or multiscale compilation, whose members have none -- largest
   * first. */
  const children = atom<Map<number, GraphEdge[]>>((get) => {
    const byId = get(nodesById);
    const byParent = new Map<number, GraphEdge[]>();
    for (const edge of get(graph).edges) {
      const list = byParent.get(edge.compilation_id) ?? [];
      list.push(edge);
      byParent.set(edge.compilation_id, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => {
        const byPriority = byPriorityDesc(a.priority, b.priority);
        if (byPriority !== 0) return byPriority;
        return bySize(byId.get(a.member_id), byId.get(b.member_id));
      });
    }
    return byParent;
  });

  /** Compilations nothing contains, largest first, which puts `carto` at the
   * top. With `servedAtTop`, every served compilation is a
   * root too, wherever else it sits: the compilations a client can ask for by
   * name, rather than the shape of the hierarchy. */
  const roots = atom<GraphNode[]>((get) => {
    const claimed = new Set(get(graph).edges.map((e) => e.member_id));
    const showServed = get(servedAtTop);
    return get(graph)
      .nodes.filter(
        (n) =>
          n.is_compilation &&
          (!claimed.has(n.source_id) || (showServed && n.is_served))
      )
      .sort(bySize);
  });

  /** Matching nodes plus every ancestor of one.
   *
   * Filtering a tree on the node alone cuts the path to a match — search for a
   * state map and the compilation containing it disappears, taking the match
   * with it. Keeping ancestors is what makes a filtered tree still a tree. */
  const matchingIds = atom<Set<number> | null>((get) => {
    const query = get(searchText).trim().toLowerCase();
    const scales = get(scaleFilter);
    if (query === "" && scales.length === 0) return null;

    const childEdges = get(children);

    const direct = new Set<number>();
    for (const node of get(graph).nodes) {
      if (nodeMatches(node, query, scales)) direct.add(node.source_id);
    }

    const keep = new Set<number>();
    const visiting = new Set<number>();

    function visit(id: number): boolean {
      if (keep.has(id)) return true;
      // The database forbids cycles, but a DAG still revisits shared nodes.
      if (visiting.has(id)) return false;
      visiting.add(id);

      let hit = direct.has(id);
      for (const edge of childEdges.get(id) ?? []) {
        if (visit(edge.member_id)) hit = true;
      }
      visiting.delete(id);

      if (hit) keep.add(id);
      return hit;
    }

    for (const root of get(roots)) visit(root.source_id);

    // The walk starts at the compilation roots, so it never reaches a standalone
    // map. They have no ancestors to widen to, so a direct match is the whole
    // test.
    for (const node of get(graph).nodes) {
      if (node.is_standalone && direct.has(node.source_id)) {
        keep.add(node.source_id);
      }
    }

    return keep;
  });

  /** Ingested maps belonging to no compilation — the hierarchy's fallback
   * bucket. Not a compilation and not a kind: just a state of the catalog, and
   * one worth seeing. The NGS quadrangles sit here until something wraps them,
   * and a superseded map often lands here permanently. */
  const standaloneNodes = atom<GraphNode[]>((get) => {
    const keep = get(matchingIds);
    return get(graph)
      .nodes.filter((n) => n.is_standalone)
      .filter((n) => keep == null || keep.has(n.source_id))
      .sort(bySize);
  });

  const visibleSlugs = atom<string[] | null>((get) => {
    const keep = get(matchingIds);
    if (keep == null) return null;
    return get(graph)
      .nodes.filter((n) => keep.has(n.source_id))
      .map((n) => n.slug);
  });

  const focusNode = atom<GraphNode | null>((get) => {
    const slug = get(focusSlug);
    if (slug == null) return null;
    return get(graph).nodes.find((n) => n.slug === slug) ?? null;
  });

  /** The graph is a DAG, so there can be several routes to a node; the first
   * found breadth-first is the shortest, which is the one worth opening. */
  const focusPath = atom<GraphNode[]>((get) => {
    const target = get(focusNode);
    if (target == null) return [];

    const childEdges = get(children);
    const byId = get(nodesById);
    const rootNodes = get(roots);

    const queue: number[][] = rootNodes.map((r) => [r.source_id]);
    const seen = new Set<number>(rootNodes.map((r) => r.source_id));

    while (queue.length > 0) {
      const path = queue.shift()!;
      const id = path[path.length - 1];
      if (id === target.source_id) {
        return path.map((i) => byId.get(i)!).filter((n) => n != null);
      }
      for (const edge of childEdges.get(id) ?? []) {
        if (seen.has(edge.member_id)) continue;
        seen.add(edge.member_id);
        queue.push([...path, edge.member_id]);
      }
    }

    return [target];
  });

  /** The selection's ancestors, which the tree keeps open to reveal it. */
  const focusAncestorIds = atom<Set<number>>(
    (get) =>
      new Set(
        get(focusPath)
          .slice(0, -1)
          .map((n) => n.source_id)
      )
  );

  /** Walk down from the selection, recording every node reached and, apart,
   * the ones that hold content: descent stops there (`has_content`), so a
   * materialized compilation's members are reached but not resolved to. */
  const focusDescent = atom((get) => {
    const target = get(focusNode);
    const all = new Set<number>();
    const resolved = new Set<number>();
    if (target == null) return { all, resolved };

    const childEdges = get(children);
    const byId = get(nodesById);
    const walk = (id: number, resolving: boolean) => {
      const node = byId.get(id);
      if (node == null) return;
      const holdsContent = !node.is_compilation || node.is_materialized;
      if (resolving && holdsContent) resolved.add(id);
      if (all.has(id)) return;
      all.add(id);
      for (const edge of childEdges.get(id) ?? []) {
        walk(edge.member_id, resolving && !holdsContent);
      }
    };
    walk(target.source_id, true);
    return { all, resolved };
  });

  const focusDescendantIds = atom((get) => get(focusDescent).all);
  const focusResolvedIds = atom((get) => get(focusDescent).resolved);

  return {
    graph,
    focusSlug,
    searchText,
    scaleFilter,
    servedAtTop,
    nodesById,
    children,
    roots,
    matchingIds,
    standaloneNodes,
    visibleSlugs,
    focusNode,
    focusPath,
    focusAncestorIds,
    focusDescendantIds,
    focusResolvedIds,
  };
}

/** A graph atom for pages that load it asynchronously: the last good graph, or
 * an empty one while it is in flight. */
export function graphValueAtom(
  loadable: Atom<{ state: string; data?: CompilationGraph }>
): Atom<CompilationGraph> {
  return atom((get) => {
    const value = get(loadable);
    if (value.state !== "hasData") return emptyGraph;
    return value.data ?? emptyGraph;
  });
}
