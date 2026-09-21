/**
 * Stratigraphic hierarchy navigation for `/lex/strat-names/<id>`.
 *
 * **What this replaces.** The original `StratNameHierarchy` rendered the entire
 * `?rule=all` payload as a nested tree: for a name inside a large group that is
 * hundreds of rows, several screens tall, and mostly about names unrelated to
 * the one being read. A first rewrite went too far the other way (an inline tag
 * strip), and a second reused the `/lex/lithologies` page's `Hierarchy`
 * component, which renders each level's name as a plain heading — so the parent
 * you most want to click was the one thing you couldn't.
 *
 * **What it does now** is nest the whole ancestry, every level of it a link:
 *
 *     Wabaunsee Group
 *       └ Howard Limestone
 *           ├ …the item's siblings…
 *           └ Aarde Shale Member          ← the page's subject
 *                 └ …its children…
 *
 * Only the *spine* is expanded by default — each ancestor shows the one child
 * that continues the path down to the item — so the page opens on the item's
 * own neighborhood rather than on everything at every level. **Show full
 * hierarchy** expands every level of the payload instead.
 *
 * **Relevance ordering.** Within any run, names carried by at least one
 * Macrostrat unit sort first and are set in bold; the rest follow in normal
 * weight. A stratigraphic tree contains a great many names that nothing in the
 * column store uses, and they are not what someone navigating it is looking
 * for.
 *
 * **The numbers are units.** `t_units` from `/defs/strat_names` is the number of
 * Macrostrat *units* carrying the name — not the number of columns (the Shaler
 * Group has 15 units across 4 columns). It renders as the tag's `details` so it
 * reads as "15 units" rather than a bare integer.
 */
import hyper from "@macrostrat/hyper";
import styles from "./hierarchy.module.sass";
import { useMemo, useState } from "react";
import { Tag, TagSize } from "@macrostrat/data-components";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { MacrostratLink } from "~/components/navigation/MacrostratLink";

const h = hyper.styled(styles);

/** Stratigraphic ranks, outermost first, with the field on a `/defs/strat_names`
 * record that names the ancestor at that rank. A record's own rank is its index
 * here; everything above it is ancestry. */
const RANKS = [
  { rank: "SGp", field: "sgp_id" },
  { rank: "Gp", field: "gp_id" },
  { rank: "SubGp", field: "subgp_id" },
  { rank: "Fm", field: "fm_id" },
  { rank: "Mbr", field: "mbr_id" },
  { rank: "Bed", field: "bed_id" },
] as const;

const RANK_INDEX: Record<string, number> = Object.fromEntries(
  RANKS.map((r, i) => [r.rank, i])
);

/** Long runs cap, and reveal progressively — a stratigraphic run is not a dozen
 * peers but sometimes hundreds (the Pennine Middle Coal Measures have 439
 * beds). The cap is generous because the tree *is* the subject on these pages;
 * "show full hierarchy" removes it entirely. */
const OVERFLOW_THRESHOLD = 30;
const COLLAPSED_COUNT = 24;
const REVEAL_STEP = 48;

function levelOf(item: any): number {
  return RANK_INDEX[item?.rank] ?? RANKS.length - 1;
}

/** The ancestor id recorded on `item` at rank level `index`, or null. The API
 * writes `0` for "none", which is not a strat name id. */
function ancestorID(item: any, index: number): number | null {
  const value = item?.[RANKS[index].field];
  if (value == null || value === 0) return null;
  return value;
}

/** The nearest recorded ancestor above `item` — its parent once levels the
 * record leaves empty are skipped. */
function parentID(item: any): number | null {
  for (let i = levelOf(item) - 1; i >= 0; i--) {
    const id = ancestorID(item, i);
    if (id != null) return id;
  }
  return null;
}

/** Names a unit actually carries, first and in order of how many — then the
 * rest alphabetically. */
function byRelevance(records: any[]): any[] {
  return [...records].sort((a, b) => {
    const ua = a?.t_units ?? 0;
    const ub = b?.t_units ?? 0;
    if (ua !== ub) return ub - ua;
    return String(a?.strat_name_long ?? "").localeCompare(
      String(b?.strat_name_long ?? "")
    );
  });
}

export interface StratNode {
  record: any;
  children: StratNode[];
}

/**
 * The flat `?rule=all` payload as a forest, each node's children sorted by
 * relevance. A record whose recorded parent isn't in the payload is a root.
 */
export function buildStratForest(data: any[]): StratNode[] {
  const nodes = new Map<number, StratNode>(
    data.map((record) => [record.strat_name_id, { record, children: [] }])
  );
  const roots: StratNode[] = [];

  for (const node of nodes.values()) {
    const parent = parentID(node.record);
    const parentNode = parent == null ? null : nodes.get(parent);
    if (parentNode == null || parentNode === node) {
      roots.push(node);
      continue;
    }
    parentNode.children.push(node);
  }

  for (const node of nodes.values()) {
    node.children = byRelevance(node.children.map((c) => c.record)).map(
      (record) => nodes.get(record.strat_name_id)!
    );
  }
  return byRelevance(roots.map((r) => r.record)).map(
    (record) => nodes.get(record.strat_name_id)!
  );
}

/** The chain of nodes from a root down to `id`, or null when it isn't in the
 * forest. */
function pathToItem(nodes: StratNode[], id: number): StratNode[] | null {
  for (const node of nodes) {
    if (node.record.strat_name_id === id) return [node];
    const below = pathToItem(node.children, id);
    if (below != null) return [node, ...below];
  }
  return null;
}

/**
 * The forest pruned to the item's neighborhood: the spine of ancestors, each
 * keeping only the child that continues the path, and at the bottom the item
 * among its siblings with its own children beneath it.
 *
 * Everything else is dropped rather than collapsed — a level of the spine with
 * its full sibling set is the old unreadable tree, one level at a time.
 */
function pruneToNeighborhood(path: StratNode[]): StratNode | null {
  if (path.length === 0) return null;

  const itemNode = path[path.length - 1];
  let current: StratNode = { record: itemNode.record, children: itemNode.children };

  // Walk back up the spine. The parent keeps every sibling (so the item sits
  // among its peers); higher ancestors keep only the spine.
  for (let i = path.length - 2; i >= 0; i--) {
    const ancestor = path[i];
    const isParent = i === path.length - 2;

    let children: StratNode[] = [current];
    if (isParent) {
      // The item leads its own sibling run. Relevance order governs the rest,
      // but the subject of the page has to be *visible*: ordered by relevance it
      // can sort past the run's cap — a 0-unit bed among 442 siblings — and
      // disappear from its own page.
      const siblings = ancestor.children
        .filter((c) => c.record.strat_name_id !== current.record.strat_name_id)
        // Siblings are terminal: expanding each one's descendants is the whole
        // tree again.
        .map((child) => ({ record: child.record, children: [] }));
      children = [current, ...siblings];
    }
    current = { record: ancestor.record, children };
  }

  return current;
}

export function StratNameHierarchy({ id }: { id: number | string }) {
  const activeId = Number(id);
  // `rule=all` returns every name in the tree this one belongs to. (The host
  // comes from settings; this used to be hardcoded to macrostrat.org, so a
  // local or dev page read production.)
  const data = useAPIResult(
    `${apiV2Prefix}/defs/strat_names?rule=all&strat_name_id=${activeId}`
  )?.success?.data;

  const [showFull, setShowFull] = useState(false);
  // Rows revealed per run, beyond the collapsed default.
  const [shown, setShown] = useState<Record<string, number>>({});

  const forest = useMemo(() => buildStratForest(data ?? []), [data]);
  const neighborhood = useMemo(() => {
    const path = pathToItem(forest, activeId);
    if (path == null) return null;
    return pruneToNeighborhood(path);
  }, [forest, activeId]);

  if (data == null || data.length === 0) return null;

  let roots: StratNode[] = forest;
  if (!showFull) {
    if (neighborhood == null) return null;
    roots = [neighborhood];
  }

  // Nothing to navigate: a name alone in its own hierarchy.
  if (roots.length === 1 && roots[0].children.length === 0 && !showFull) {
    return null;
  }

  let toggleLabel = "Show full hierarchy";
  if (showFull) toggleLabel = "Show only nearby names";

  return h("div.strat-hierarchy", [
    h("div.strat-tree", { key: "tree" }, [
      roots.map((node) =>
        h(StratTreeNode, {
          key: node.record.strat_name_id,
          node,
          activeId,
          depth: 0,
          showFull,
          shown,
          setShown,
        })
      ),
    ]),
    h(
      "button.text-control.hierarchy-toggle",
      { key: "toggle", type: "button", onClick: () => setShowFull(!showFull) },
      toggleLabel
    ),
  ]);
}

/** One node and its children. The node itself is always a link — the parent is
 * the thing you most often want to click, and rendering it as a bare heading is
 * what made the previous version frustrating. */
function StratTreeNode({
  node,
  activeId,
  depth,
  showFull,
  shown,
  setShown,
}: {
  node: StratNode;
  activeId: number;
  depth: number;
  showFull: boolean;
  shown: Record<string, number>;
  setShown: (fn: (c: Record<string, number>) => Record<string, number>) => void;
}) {
  const { record, children } = node;
  const isActive = record.strat_name_id === activeId;

  let childBlock = null;
  if (children.length > 0) {
    const key = `n${record.strat_name_id}`;
    let limit = children.length;
    if (!showFull && children.length > OVERFLOW_THRESHOLD) {
      limit = Math.min(shown[key] ?? COLLAPSED_COUNT, children.length);
    }
    const remaining = children.length - limit;

    let moreControl = null;
    if (remaining > 0) {
      moreControl = h(
        "button.text-control",
        {
          key: "more",
          type: "button",
          onClick: () =>
            setShown((current) => ({
              ...current,
              [key]: (current[key] ?? COLLAPSED_COUNT) + REVEAL_STEP,
            })),
        },
        `and ${remaining.toLocaleString()} more…`
      );
    }

    childBlock = h("div.strat-children", { key: "children" }, [
      children.slice(0, limit).map((child) =>
        h(StratTreeNode, {
          key: child.record.strat_name_id,
          node: child,
          activeId,
          depth: depth + 1,
          showFull,
          shown,
          setShown,
        })
      ),
      moreControl,
    ]);
  }

  return h("div.strat-node", [
    h(StratNodeTag, { key: "tag", record, isActive }),
    childBlock,
  ]);
}

/**
 * One name: its rank-qualified name, and the unit count as the tag's `details`
 * so the number says what it counts.
 *
 * A name at least one unit carries is bold; one no unit carries is set in
 * normal weight and dimmed. That is the single most useful signal in a
 * stratigraphic tree, most of which is names the column store never uses.
 */
function StratNodeTag({ record, isActive }) {
  const units = record?.t_units ?? 0;

  let details: string | undefined = undefined;
  if (units > 0) {
    details = `${units.toLocaleString()} ${units === 1 ? "unit" : "units"}`;
  }

  let holder = "span.tag-holder";
  if (units > 0) holder += ".has-units";
  if (units === 0) holder += ".no-units";
  if (isActive) holder += ".is-active";

  return h(
    holder,
    h(
      MacrostratLink,
      { item: { strat_name_id: record.strat_name_id } },
      h(Tag, {
        name: record.strat_name_long ?? record.strat_name,
        details,
        size: TagSize.Small,
      })
    )
  );
}

export interface StratAncestor {
  id: number;
  name: string;
  rank: string;
}

/**
 * A single record's ancestry, outermost first, straight off the record itself.
 *
 * `/defs/strat_names` carries both the name *and* the id of each enclosing rank
 * (`gp` / `gp_id`, `fm` / `fm_id`, …), so a record knows where it sits without
 * the `?rule=all` tree. That is what lets a concept page — which has a set of
 * names rather than one subject, and so no single neighborhood to show — still
 * offer hierarchy navigation, per usage.
 */
export function stratAncestryPath(record: any): StratAncestor[] {
  const out: StratAncestor[] = [];
  const self = record?.strat_name_id;
  for (let i = 0; i < levelOf(record); i++) {
    const { rank, field } = RANKS[i];
    const id = ancestorID(record, i);
    const name = record?.[field.replace(/_id$/, "")];
    if (id == null || id === self || name == null || name === "") continue;
    out.push({ id, name, rank });
  }
  return out;
}

/** The ancestry as a `›`-separated run of links. Renders nothing at the top of
 * a hierarchy, which is most group-rank names. */
export function StratAncestryPath({ record }: { record: any }) {
  const ancestors = useMemo(() => stratAncestryPath(record), [record]);
  if (ancestors.length === 0) return null;

  const nodes = [];
  ancestors.forEach((ancestor, i) => {
    if (i > 0) nodes.push(h("span.path-separator", { key: `sep-${i}` }, "›"));
    nodes.push(
      h(
        MacrostratLink,
        { key: `anc-${i}`, item: { strat_name_id: ancestor.id } },
        ancestor.name
      )
    );
  });

  return h("div.strat-ancestry", nodes);
}
