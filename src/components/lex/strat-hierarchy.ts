/**
 * Stratigraphic hierarchy navigation for `/lex/strat-names/<id>`.
 *
 * **What this replaces.** The old `StratNameHierarchy` rendered the *entire*
 * tree returned by `?rule=all` as a nested `Hierarchy`: for a name inside a
 * large group that is hundreds of rows, several screens tall, and mostly about
 * names unrelated to the one being read. It also gave every node a bare number
 * with nothing to say what was being counted.
 *
 * **What it shows instead** is a *bounded* tree, in the same nested form the
 * `/lex/lithologies` page uses (`Hierarchy` from `@macrostrat-web/lithology-
 * hierarchy`) — deliberately between the two existing treatments. The inline
 * tag strip that the lithology *detail* pages use turned out to be too terse
 * for stratigraphy, where the tree is the subject rather than a footnote; the
 * full `?rule=all` tree is unreadable. So: one parent level up, that parent's
 * children (the item's siblings) beneath it, and the item's own children nested
 * under it. Long runs reveal progressively rather than all at once.
 *
 * The ancestry above that parent stays a `›` path (`StratAncestryPath`), which
 * is also what the concept page renders per usage.
 *
 * **The numbers are units.** `t_units` from `/defs/strat_names` is the number of
 * Macrostrat *units* carrying the name — not the number of columns (the Shaler
 * Group has 15 units across 4 columns). It is rendered as the tag's `details`
 * so it reads as "15 units" rather than a bare "15", and a name carried by no
 * unit at all is set in normal weight instead of bold: it exists in the
 * lexicon, but nothing in the column store uses it.
 */
import hyper from "@macrostrat/hyper";
import styles from "./hierarchy.module.sass";
import { useMemo, useState } from "react";
import { Tag, TagSize } from "@macrostrat/data-components";
import { Hierarchy } from "@macrostrat-web/lithology-hierarchy";
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

/** Long runs cap, and reveal progressively rather than all at once — a
 * stratigraphic run is not a dozen peers but sometimes hundreds (the Pennine
 * Middle Coal Measures have 439 beds).
 *
 * The cap is set well above the inline strip's (five): this view is a tree, and
 * the tree *is* the subject on a stratigraphic page, so it should open showing
 * a real neighborhood rather than a hint of one. Two dozen names is roughly a
 * screen of wrapped tags. */
const OVERFLOW_THRESHOLD = 30;
const COLLAPSED_COUNT = 24;
const REVEAL_STEP = 48;

export interface StratRelations {
  item: any;
  /** The nearest recorded ancestor — the one level of tree shown above the item. */
  parent: any | null;
  ancestors: any[];
  siblings: any[];
  children: any[];
}

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
 * Ancestry, siblings and one level of children for `item`, out of the flat
 * `?rule=all` payload.
 *
 * Siblings are *structural*: the same rank under the same parent, not every
 * name of that rank in the tree. Children are the records whose own nearest
 * recorded ancestor is this one — so a bed recorded under a formation shows up
 * on the formation when the intervening member is absent, rather than being
 * unreachable.
 */
export function stratHierarchyRelations(
  data: any[] | null,
  id: number
): StratRelations | null {
  if (data == null || data.length === 0) return null;
  const byID = new Map<number, any>(data.map((d) => [d.strat_name_id, d]));
  const item = byID.get(id);
  if (item == null) return null;

  const ancestors: any[] = [];
  for (let i = 0; i < levelOf(item); i++) {
    const ancestorId = ancestorID(item, i);
    if (ancestorId == null || ancestorId === id) continue;
    const record = byID.get(ancestorId);
    if (record != null) ancestors.push(record);
  }

  const parent = parentID(item);
  const siblings = data.filter(
    (d) =>
      d.strat_name_id !== id &&
      levelOf(d) === levelOf(item) &&
      parentID(d) === parent
  );

  const children = data.filter((d) => parentID(d) === id);

  return {
    item,
    parent: parent == null ? null : byID.get(parent) ?? null,
    ancestors,
    siblings,
    children,
  };
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

/**
 * The stratigraphic neighborhood as a bounded tree.
 *
 * Bounded three ways, each for a case that actually occurs:
 *  - **one parent level.** Ancestry above it is the `›` path, not tree levels —
 *    a bed six ranks deep would otherwise open with five nested headers.
 *  - **siblings are terminal.** They render as tags, not as subtrees of their
 *    own; expanding every sibling's children is the full tree again.
 *  - **runs reveal progressively.** The Pennine Middle Coal Measures have 439
 *    beds; `REVEAL_STEP` at a time keeps the page bounded.
 */
export function StratNameHierarchy({ id }: { id: number | string }) {
  const activeId = Number(id);
  // `rule=all` returns every name in the tree this one belongs to — the input
  // the relations are derived from. (The host comes from settings; this used to
  // be hardcoded to macrostrat.org, so a local or dev page read production.)
  const data = useAPIResult(
    `${apiV2Prefix}/defs/strat_names?rule=all&strat_name_id=${activeId}`
  )?.success?.data;

  const relations = useMemo(
    () => stratHierarchyRelations(data, activeId),
    [data, activeId]
  );

  // Rows revealed per run, beyond the collapsed default.
  const [shown, setShown] = useState<Record<string, number>>({});

  // Stable component identity — `Hierarchy` would otherwise remount every tag
  // on each reveal. `setShown` is stable, so this is built once.
  const itemComponent = useMemo(() => buildStratItem(setShown), []);

  const tree = useMemo(
    () => stratTree(relations, shown),
    [relations, shown]
  );

  if (relations == null || tree == null) return null;

  return h("div.strat-hierarchy", [
    h(StratAncestryPath, { key: "path", record: relations.item }),
    h(Hierarchy, { key: "tree", data: tree, itemComponent }),
  ]);
}

/** How many of a run are visible, given what has been revealed. */
function visibleCount(key: string, total: number, shown: Record<string, number>) {
  if (total <= OVERFLOW_THRESHOLD) return total;
  return Math.min(shown[key] ?? COLLAPSED_COUNT, total);
}

/** A run of records as tree nodes, with a trailing "and N more…" node when the
 * run is capped. The control is a node rather than a sibling of the list so it
 * sits in the same wrapped flow as the tags.
 *
 * A terminal node's `name` is only ever used as its React key (the label is
 * rendered from `data` by the item component), and stratigraphic names repeat
 * among siblings — the Howard Limestone has two members called "Aarde Shale
 * Member" — so these are keyed by id rather than by name. */
function runNodes(key: string, items: any[], shown: Record<string, number>) {
  const limit = visibleCount(key, items.length, shown);
  const nodes: any[] = items.slice(0, limit).map((record) => ({
    name: `id:${record.strat_name_id}`,
    data: record,
  }));

  const remaining = items.length - limit;
  if (remaining > 0) {
    nodes.push({
      name: `more:${key}`,
      data: { __more: { key, remaining } },
    });
  }
  return nodes;
}

/**
 * The bounded tree handed to `Hierarchy`.
 *
 * The root node's header is hidden at level 0 by the hierarchy's own styles, so
 * the parent is nested one level in to make its name visible. `Hierarchy` sorts
 * children into terminal nodes (tags in a wrapped list) and sub-trees (nested,
 * with a heading) by whether they have children — which is exactly the split
 * wanted here: siblings are terminal, the active item is a sub-tree when it has
 * children of its own.
 */
function stratTree(
  relations: StratRelations | null,
  shown: Record<string, number>
) {
  if (relations == null) return null;
  const { item, parent, siblings, children } = relations;

  // With children the item is a sub-tree and its `name` is the heading; without
  // them it is a terminal node among its siblings, where `name` is just the key.
  let self: any = {
    name: `id:${item.strat_name_id}`,
    data: { ...item, __active: true },
  };
  if (children.length > 0) {
    self.name = item.strat_name_long ?? item.strat_name;
    self.children = runNodes("children", children, shown);
  }

  // No parent: the item is the top of its hierarchy, so it *is* the level.
  if (parent == null) {
    if (children.length === 0) return null;
    return { name: "", data: {}, children: [self] };
  }

  const peers = runNodes("siblings", siblings, shown);
  return {
    name: "",
    data: {},
    children: [
      {
        name: parent.strat_name_long ?? parent.strat_name,
        data: parent,
        children: [...peers, self],
      },
    ],
  };
}

/**
 * One node of the tree: the name, and the unit count as the tag's `details` so
 * the number says what it counts. A name no unit carries gets no count and
 * normal weight — present in the lexicon, absent from the column store. The
 * active item is marked so it can be found among its siblings.
 */
function buildStratItem(
  setShown: (fn: (current: Record<string, number>) => Record<string, number>) => void
) {
  return function StratHierarchyItem({ data }: { data: any }) {
    if (data?.__more != null) {
      const { key, remaining } = data.__more;
      return h(
        "button.text-control",
        {
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

    const units = data?.t_units ?? 0;

    let details: string | undefined = undefined;
    if (units > 0) {
      details = `${units.toLocaleString()} ${units === 1 ? "unit" : "units"}`;
    }

    let holder = "span.tag-holder";
    if (units === 0) holder += ".no-units";
    if (data?.__active) holder += ".is-active";

    return h(
      holder,
      h(
        MacrostratLink,
        { item: { strat_name_id: data.strat_name_id } },
        h(Tag, {
          name: data.strat_name_long ?? data.strat_name,
          details,
          size: TagSize.Small,
        })
      )
    );
  };
}
