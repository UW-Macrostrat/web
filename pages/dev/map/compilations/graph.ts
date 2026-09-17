/** The compilation graph, and the flat row set the list is built from.
 *
 * The whole hierarchy arrives in one payload (`/compilations/graph`) — a few
 * hundred nodes and edges, far smaller than the map catalog — so everything
 * below is local work over an object already in hand. That is the point of the
 * single request: filtering, grouping and selection need the *whole* graph, and
 * a lazily-expanded tree can only ever answer for what has been opened.
 */

export type CompilationState = "virtual" | "current" | "stale" | "ingested";

export interface GraphNode {
  source_id: number;
  slug: string;
  name: string | null;
  scale: string | null;
  /** A compilation served as a tile layer. Structural — a container, not a map
   * anyone means to look at. */
  is_served_layer: boolean;
  /** Has members. */
  is_compilation: boolean;
  /** Holds polygons of its own, so identity resolution stops here. */
  holds_polygons: boolean;
  /** A compilation that replaced its constituents. */
  is_materialized: boolean;
  /** A member of an ingested compilation: a real source with a footprint and a
   * citation, but no polygons, no linework and no faces. */
  is_documentary: boolean;
  n_members: number;
  n_sources: number;
  content: "ingested" | "derived" | null;
  assembly_mode: string | null;
  state: CompilationState | null;
  area_km: number | null;
  /** In no compilation at all — an ingested map nothing has wrapped yet. */
  is_standalone: boolean;
  /** Stage I supersession: the map that replaced this one. Often the reason a
   * map sits outside every compilation. */
  superseded_by: number | null;
  map_layer: number | null;
  min_zoom: number | null;
  max_zoom: number | null;
  placed_in_layer: number | null;
}

export interface GraphEdge {
  compilation_id: number;
  member_id: number;
  /** Higher wins where members overlap; null in a disjoint mosaic. */
  priority: number | null;
  role: string | null;
}

export interface CompilationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const emptyGraph: CompilationGraph = { nodes: [], edges: [] };

/** One row per membership edge: a map *as seen from* the compilation that
 * contains it. A map belonging to two compilations is two rows, which is what
 * makes the grouped list an honest rendering of a DAG. */
export interface CompilationRow extends GraphNode {
  /** Unique per (parent, member): `source_id` alone is not, by design. */
  key: string;
  priority: number | null;
  role: string | null;
  depth: number;

  /** The compilation this row sits in — the list's inner grouping. */
  parent_id: number;
  parent_slug: string;
  parent_name: string;
  /** Distinguishes two appearances of the same compilation under different
   * roots, so consecutive-run grouping doesn't merge them. */
  group_key: string;

  /** The root of this branch — a served layer, or an unplaced compilation.
   * The list's outer sectioning. */
  section_id: number;
  section_slug: string;
  section_name: string;
}

export interface FlatGraph {
  rows: CompilationRow[];
  /** Every node by id, for looking up a row's own facts. */
  byId: Map<number, GraphNode>;
  /** Compilations nothing else contains. */
  roots: GraphNode[];
}

const nodeName = (node: GraphNode) => node.name ?? node.slug;

/** Depth-first from the roots, so consecutive rows share a parent and the
 * scroll body's run-based headers land in the right places. */
export function flattenGraph(graph: CompilationGraph): FlatGraph {
  const byId = new Map(graph.nodes.map((n) => [n.source_id, n]));

  const children = new Map<number, GraphEdge[]>();
  const claimed = new Set<number>();
  for (const edge of graph.edges) {
    const list = children.get(edge.compilation_id) ?? [];
    list.push(edge);
    children.set(edge.compilation_id, list);
    claimed.add(edge.member_id);
  }

  // Served layers first — they are the structural roots most of the graph hangs
  // from; then anything not yet placed under one, which is worth seeing as a
  // root in its own right.
  const roots = graph.nodes
    .filter((n) => n.is_compilation && !claimed.has(n.source_id))
    .sort((a, b) => {
      if (a.is_served_layer !== b.is_served_layer) {
        return a.is_served_layer ? -1 : 1;
      }
      return a.slug.localeCompare(b.slug);
    });

  const rows: CompilationRow[] = [];

  function walk(
    parent: GraphNode,
    section: GraphNode,
    depth: number,
    path: string
  ) {
    const edges = children.get(parent.source_id) ?? [];
    const groupKey = `${path}`;

    for (const edge of edges) {
      const node = byId.get(edge.member_id);
      if (node == null) continue;

      rows.push({
        ...node,
        key: `${path}/${node.source_id}`,
        priority: edge.priority,
        role: edge.role,
        depth,
        parent_id: parent.source_id,
        parent_slug: parent.slug,
        parent_name: nodeName(parent),
        group_key: groupKey,
        section_id: section.source_id,
        section_slug: section.slug,
        section_name: nodeName(section),
      });
    }

    // Descend after emitting the whole level, so a compilation's own members
    // read as a block beneath it rather than interleaved with its siblings.
    for (const edge of edges) {
      const node = byId.get(edge.member_id);
      if (node == null || !node.is_compilation) continue;
      walk(node, section, depth + 1, `${path}/${node.source_id}`);
    }
  }

  for (const root of roots) {
    walk(root, root, 0, `${root.source_id}`);
  }

  return { rows, byId, roots };
}

/** Where a map's own page lives. Slugs are unique in `maps.sources` and never
 * all-digits, so `/maps/<slug>` and `/maps/<source_id>` share a route without
 * colliding; the slug is the readable form the CLI and the compilation system
 * use throughout. */
export function mapPageHref(node: { slug: string | null; source_id: number }) {
  return `/maps/${node.slug ?? node.source_id}`;
}

/** Scale bands, coarsest first — the order they mean something in, which is not
 * alphabetical. */
export const scaleOrder = ["tiny", "small", "medium", "large"];
