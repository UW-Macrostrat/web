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
 * **What it does now** is nest the whole ancestry as cards that contain one
 * another, every level of it a link:
 *
 *     ┌ Wabaunsee Group ─────────────────────────────────┐
 *     │ ┌ Howard Limestone ────────────────────────────┐ │
 *     │ │ [Aarde Shale Mbr] [sibling] [sibling] …      │ │
 *     │ │       ↑ the page's subject                   │ │
 *     │ └──────────────────────────────────────────────┘ │
 *     └──────────────────────────────────────────────────┘
 *
 * Containment is what shows the nesting, so a level needs no indent rule; a run
 * of terminal names is a flexible grid inside its parent rather than a column
 * of one name per line.
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
 * Group has 15 units across 4 columns). It renders beside the name as "15
 * units" rather than as a bare integer.
 */
import hyper from "@macrostrat/hyper";
import styles from "./hierarchy.module.sass";
import { useMemo, useState } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { MacrostratLink } from "~/components/navigation/MacrostratLink";
import { LinkCard } from "~/components/cards";
import { buildHrefForItem } from "~/_providers/navigation";

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

/** Long runs are shown a window at a time, and reveal progressively — a
 * stratigraphic run is not a dozen peers but sometimes hundreds (this Pennine
 * formation has 446 beds). The window is generous because the tree *is* the
 * subject on these pages; "show full hierarchy" removes it entirely. */
const OVERFLOW_THRESHOLD = 30;
const COLLAPSED_COUNT = 24;
const REVEAL_STEP = 48;

/** Rows a reader has revealed in one run, in each direction, beyond the window
 * the subject's position selects. */
interface RunReveal {
  before: number;
  after: number;
}

const NO_REVEAL: RunReveal = { before: 0, after: 0 };

type RevealMap = Record<string, RunReveal>;
type SetReveal = (update: (current: RevealMap) => RevealMap) => void;

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

/**
 * Alphabetical, tie-broken on id.
 *
 * A run has to sit in the same order on every page that shows it. Sorting by
 * unit count (as this once did) reshuffled a level as you navigated into it, so
 * the name you had just clicked was not where you left it — and neither were
 * the ones beside it. The unit count still governs *emphasis*, which is the
 * part of the old behavior worth keeping.
 */
function byName(records: any[]): any[] {
  return [...records].sort((a, b) => {
    const order = String(a?.strat_name_long ?? "").localeCompare(
      String(b?.strat_name_long ?? "")
    );
    if (order !== 0) return order;
    return (a?.strat_name_id ?? 0) - (b?.strat_name_id ?? 0);
  });
}

export interface StratNode {
  record: any;
  children: StratNode[];
}

/**
 * The flat `?rule=all` payload as a forest, each node's children in name order.
 * A record whose recorded parent isn't in the payload is a root.
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
    node.children = byName(node.children.map((c) => c.record)).map(
      (record) => nodes.get(record.strat_name_id)!
    );
  }
  return byName(roots.map((r) => r.record)).map(
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
 * in among its siblings, in order, with its own children beneath it.
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
      // The item sits where the run's order puts it, carrying its own children;
      // its siblings are terminal, since expanding each one's descendants is
      // the whole tree again. It used to be pinned to the front so it couldn't
      // fall past the run's cap — the cap is now a window that reaches it
      // instead (`StratTreeNode`), which leaves the order alone.
      children = ancestor.children.map((child) => {
        if (child.record.strat_name_id === current.record.strat_name_id) {
          return current;
        }
        return { record: child.record, children: [] };
      });
    }
    current = { record: ancestor.record, children };
  }

  return current;
}

/** Records a subtree holds, counting the node itself. */
function countNodes(node: StratNode): number {
  return node.children.reduce((sum, child) => sum + countNodes(child), 1);
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
  // Rows revealed per run, beyond the window each one opens with.
  const [revealed, setRevealed] = useState<RevealMap>({});

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

  // The full view is only worth offering when it would add something: the
  // neighborhood often *is* the whole payload, and a control that changes
  // nothing is worse than no control.
  let toggle = null;
  const nearbyCount = neighborhood == null ? 0 : countNodes(neighborhood);
  if (data.length > nearbyCount) {
    toggle = h(
      "button.text-control.hierarchy-toggle",
      { key: "toggle", type: "button", onClick: () => setShowFull(!showFull) },
      toggleLabel
    );
  }

  return h("div.strat-hierarchy", [
    h("h3.hierarchy-header", { key: "header" }, "Hierarchy"),
    h("div.strat-tree", { key: "tree" }, [
      roots.map((node) =>
        h(StratTreeNode, {
          key: node.record.strat_name_id,
          node,
          activeId,
          depth: 0,
          showFull,
          revealed,
          setRevealed,
        })
      ),
    ]),
    toggle,
  ]);
}

/**
 * The slice of a run to show: a fixed window aligned to a multiple of its own
 * size, containing the subject of the page, plus whatever the reader has
 * revealed at either end.
 *
 * Aligning it — rather than centering it on the subject — is what makes the run
 * legible as you step through it: every name in the same slice opens the same
 * window, in the same order, so the set you are reading stays put instead of
 * sliding by one with each name you visit. A run no longer than
 * `OVERFLOW_THRESHOLD`, and any run at all under "show full hierarchy", is
 * shown whole.
 */
function runWindow({
  children,
  activeId,
  showFull,
  revealed,
  key,
}: {
  children: StratNode[];
  activeId: number;
  showFull: boolean;
  revealed: RevealMap;
  key: string;
}): { start: number; end: number } {
  if (showFull || children.length <= OVERFLOW_THRESHOLD) {
    return { start: 0, end: children.length };
  }

  const activeIndex = children.findIndex(
    (child) => child.record.strat_name_id === activeId
  );

  // A run holding no subject — every level but the one the page is about —
  // opens at its beginning.
  let windowStart = 0;
  if (activeIndex > 0) {
    windowStart = Math.floor(activeIndex / COLLAPSED_COUNT) * COLLAPSED_COUNT;
  }

  const reveal = revealed[key] ?? NO_REVEAL;
  return {
    start: Math.max(0, windowStart - reveal.before),
    end: Math.min(
      children.length,
      windowStart + COLLAPSED_COUNT + reveal.after
    ),
  };
}

/**
 * One node and its children, as a card that contains the cards below it.
 *
 * Every node is a link except the one the page is already about — the parent in
 * particular is the thing you most often want to click, and rendering it as a
 * bare heading is what made an earlier version frustrating. A level with
 * children is a container card holding them; a terminal name is a cell in the
 * grid its parent lays out. Containment is what shows the nesting, so the
 * indent-and-hairline rule the tag strip used is gone.
 */
function StratTreeNode({
  node,
  activeId,
  depth,
  showFull,
  revealed,
  setRevealed,
}: {
  node: StratNode;
  activeId: number;
  depth: number;
  showFull: boolean;
  revealed: RevealMap;
  setRevealed: SetReveal;
}) {
  const { record, children } = node;
  const isActive = record.strat_name_id === activeId;

  let childBlock = null;
  if (children.length > 0) {
    const key = `n${record.strat_name_id}`;
    const { start, end } = runWindow({
      children,
      activeId,
      showFull,
      revealed,
      key,
    });

    const hiddenBefore = start;
    const hiddenAfter = children.length - end;

    const revealMore = (direction: "before" | "after") => {
      setRevealed((current) => {
        const run = current[key] ?? NO_REVEAL;
        return {
          ...current,
          [key]: { ...run, [direction]: run[direction] + REVEAL_STEP },
        };
      });
    };

    // What the window leaves out, at the end it leaves it out: each control
    // expands its own side of this run, rather than both at once.
    let earlierControl = null;
    if (hiddenBefore > 0) {
      earlierControl = h(
        "button.text-control",
        { key: "earlier", type: "button", onClick: () => revealMore("before") },
        `${hiddenBefore.toLocaleString()} earlier…`
      );
    }

    let moreControl = null;
    if (hiddenAfter > 0) {
      moreControl = h(
        "button.text-control",
        { key: "more", type: "button", onClick: () => revealMore("after") },
        `${hiddenAfter.toLocaleString()} more…`
      );
    }

    childBlock = h("div.strat-children", { key: "children" }, [
      earlierControl,
      children.slice(start, end).map((child) =>
        h(StratTreeNode, {
          key: child.record.strat_name_id,
          node: child,
          activeId,
          depth: depth + 1,
          showFull,
          revealed,
          setRevealed,
        })
      ),
      moreControl,
    ]);
  }

  const name = record.strat_name_long ?? record.strat_name;
  const units = record?.t_units ?? 0;

  // The count says what it counts. A name at least one unit carries is set in
  // bold; one no unit carries is quieted — the single most useful signal in a
  // stratigraphic tree, most of which is names the column store never uses.
  let unitsNode = null;
  if (units > 0) {
    unitsNode = h(
      "span.strat-units",
      { key: "units" },
      `${units.toLocaleString()} ${units === 1 ? "unit" : "units"}`
    );
  }

  let className = "strat-card";
  if (units > 0) className += " has-units";
  else className += " no-units";
  if (isActive) className += " is-active";
  if (childBlock != null) className += " has-children";

  // The subject of the page has nowhere to go, so its card isn't a link.
  let href: string | null = buildHrefForItem({
    strat_name_id: record.strat_name_id,
  });
  if (isActive) href = null;

  return h(
    LinkCard,
    {
      className,
      density: "compact",
      href,
      // A container card holds links of its own, so it needs the overlay form;
      // a terminal card is simply the anchor.
      nestedLinks: childBlock != null,
      label: name,
      title: h("span.strat-card-head", [
        h("span.strat-card-name", { key: "name" }, name),
        unitsNode,
      ]),
    },
    childBlock
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
