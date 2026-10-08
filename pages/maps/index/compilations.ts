/** Which compilations each map belongs to, resolved from the compilation graph.
 *
 * Membership is transitive: a quadrangle in `ngs-surface` is in `carto` too,
 * through it. Resolved on the server so the graph itself (~500 kB) stays out of
 * the page; the list carries only each map's ancestor slugs.
 */

import {
  nodeName,
  type CompilationGraph,
  type GraphNode,
} from "~/components/compilation-tree";

export interface MapRow {
  source_id: number;
  slug: string | null;
  name: string | null;
  scale: string | null;
  ref_title: string | null;
  ref_source: string | null;
  ref_year: string | null;
  /** Slugs of every compilation the map is in, directly or through another. */
  compilations: string[];
}

export interface CompilationOption {
  slug: string;
  name: string;
  is_served: boolean;
  /** Maps in the list that resolve to this compilation. */
  n_maps: number;
}

export function joinCompilations(
  maps: Omit<MapRow, "compilations">[],
  graph: CompilationGraph
): { rows: MapRow[]; compilations: CompilationOption[] } {
  const nodes = new Map<number, GraphNode>();
  for (const node of graph.nodes) nodes.set(node.source_id, node);

  const parents = new Map<number, number[]>();
  for (const edge of graph.edges) {
    const list = parents.get(edge.member_id) ?? [];
    list.push(edge.compilation_id);
    parents.set(edge.member_id, list);
  }

  const ancestorsOf = memoizedAncestors(parents);
  const counts = new Map<number, number>();

  const rows = maps.map((map) => {
    const ancestors = ancestorsOf(map.source_id);
    for (const id of ancestors) counts.set(id, (counts.get(id) ?? 0) + 1);
    const compilations = [...ancestors]
      .map((id) => nodes.get(id)?.slug)
      .filter((slug) => slug != null);
    return { ...map, compilations };
  });

  const compilations = graph.nodes
    .filter((node) => node.is_compilation && counts.has(node.source_id))
    .map((node) => ({
      slug: node.slug,
      name: nodeName(node),
      is_served: node.is_served,
      n_maps: counts.get(node.source_id),
    }));
  compilations.sort((a, b) => a.name.localeCompare(b.name));

  return { rows, compilations };
}

/** The graph is a DAG, so ancestor sets are shared and cached per node. */
function memoizedAncestors(parents: Map<number, number[]>) {
  const cache = new Map<number, Set<number>>();
  const visiting = new Set<number>();

  function ancestorsOf(id: number): Set<number> {
    const cached = cache.get(id);
    if (cached != null) return cached;
    const result = new Set<number>();
    // Guards against a cycle, which the database shouldn't allow
    if (visiting.has(id)) return result;
    visiting.add(id);
    for (const parent of parents.get(id) ?? []) {
      result.add(parent);
      for (const ancestor of ancestorsOf(parent)) result.add(ancestor);
    }
    visiting.delete(id);
    cache.set(id, result);
    return result;
  }

  return ancestorsOf;
}
