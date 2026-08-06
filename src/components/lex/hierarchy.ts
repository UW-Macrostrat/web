/**
 * Hierarchy navigation for the `/lex` detail pages of types whose definitions
 * carry a `class` → `type` (→ `group`) tree: lithologies, economic uses, and
 * environments. Intervals (timescale/age scale) and stratigraphic names
 * (`StratNameHierarchy`) already have bespoke equivalents; this fills the gap the
 * others had, in the same place on the page.
 *
 * **This is deliberately not the tree the list pages render.** It shows only the
 * item's immediate neighborhood: its ancestors, its direct siblings, and one
 * level of children.
 *
 * The wrinkle is that `class` / `type` / `group` are *strings on each record*, not
 * entities — a level is navigable only when some item is named after it (`type:
 * "plutonic"` has a lithology called "plutonic"; `group: "felsic"` has none). So a
 * level with no eponymous item is **stripped**: it never appears as a link, and
 * items beneath it are treated as children of the nearest level that does have
 * one. Items are rendered with the shared `MacrostratHierarchyItem`, so they link
 * through the ambient `MacrostratInteractionProvider` like every other lexicon
 * link. See [[Geologic lexicon pages]].
 */
import hyper from "@macrostrat/hyper";
import styles from "./hierarchy.module.sass";
import { useMemo, useState } from "react";
import { Button } from "@blueprintjs/core";
import { MacrostratHierarchyItem } from "@macrostrat-web/lithology-hierarchy";
import { ExpansionPanel } from "@macrostrat/data-components";
import { lexTypeConfig, lexTypeHasHierarchy } from "./data-loaders";
import { useLexDefs } from "./item-atoms";

const h = hyper.styled(styles);

/** Grouping fields, outermost first. A record's `name` matching one of these
 * means the record *is* that level's node (`{name: "plutonic", type:
 * "plutonic"}`). Anything else is a leaf. `group` is absent from economics and
 * environments, which just makes those hierarchies one level shallower. */
const LEVEL_FIELDS = ["class", "type", "group"] as const;
const LEAF_LEVEL = LEVEL_FIELDS.length;

/** A record's grouping values, with the API's empty strings normalized away. */
function levelPath(item: any): (string | null)[] {
  return LEVEL_FIELDS.map((f) => {
    const value = item?.[f];
    if (value == null || value === "") return null;
    return value;
  });
}

/** Which level a record *is*: 0 = class, 1 = type, 2 = group, 3 = a leaf item. */
function levelOf(item: any): number {
  const path = levelPath(item);
  for (let i = 0; i < LEVEL_FIELDS.length; i++) {
    if (path[i] != null && path[i] === item.name) return i;
  }
  return LEAF_LEVEL;
}

/** Do two records sit under the same ancestry, down to `depth` levels? */
function sharesPath(a: any, b: any, depth: number): boolean {
  const pathA = levelPath(a);
  const pathB = levelPath(b);
  for (let i = 0; i < depth; i++) {
    if (pathA[i] !== pathB[i]) return false;
  }
  return true;
}

/** The record that *is* level `index` of `item`'s ancestry, if one exists. */
function itemForLevel(defs: any[], item: any, index: number): any | null {
  const path = levelPath(item);
  const name = path[index];
  if (name == null) return null;
  return (
    defs.find(
      (d) =>
        d.name === name && levelOf(d) === index && sharesPath(d, item, index)
    ) ?? null
  );
}

/** Ancestors that exist as records, outermost first. Levels with no eponymous
 * record are skipped rather than rendered as dead text. */
function ancestorsOf(defs: any[], item: any): any[] {
  const out = [];
  for (let i = 0; i < levelOf(item); i++) {
    const ancestor = itemForLevel(defs, item, i);
    if (ancestor != null) out.push(ancestor);
  }
  return out;
}

/** The nearest ancestor that exists as a record — the item's parent once
 * non-navigable levels are stripped. */
function parentOf(defs: any[], item: any): any | null {
  const ancestors = ancestorsOf(defs, item);
  return ancestors[ancestors.length - 1] ?? null;
}

export interface LexChildGroup {
  /** The stripped level's name — a grouping string with no record of its own. */
  name: string;
  items: any[];
}

export interface LexHierarchyRelations {
  /** Outermost → nearest; only levels that exist as records. */
  ancestors: any[];
  /** Records at the item's own level under the same immediate ancestry. */
  siblings: any[];
  /** Immediate children: nothing stripped between them and the item. */
  children: any[];
  /** Children that sit under a stripped level, gathered under that level's name.
   * They're a level further out than the rest, so they stay collapsed until asked
   * for rather than being mixed in with the immediate children. */
  childGroups: LexChildGroup[];
}

/** The nearest grouping level between `item` and its descendant `child` that has
 * no record of its own — `null` when the child is immediately below `item`. */
function strippedLevelBetween(item: any, child: any): string | null {
  const childPath = levelPath(child);
  for (let i = levelOf(item) + 1; i < levelOf(child); i++) {
    if (childPath[i] == null) continue;
    // A level named after the item itself is the same node recorded redundantly
    // (`{name: "igneous", class: "igneous", type: "igneous"}`), not a level in
    // between — so the child is immediate, not hidden under an "igneous" chip.
    if (childPath[i] === item.name) continue;
    return childPath[i];
  }
  return null;
}

/**
 * The item's immediate neighborhood in the type's hierarchy.
 *
 * Siblings are *structural*: same level, same ancestry — so "granite"'s siblings
 * are the other felsic plutonic rocks, not every plutonic rock. Children use the
 * stripped parent instead, so a record under a level with no eponymous item (a
 * felsic rock, say) still surfaces one level up rather than being unreachable.
 */
export function lexHierarchyRelations(
  defs: any[] | null,
  item: any,
  idField: string
): LexHierarchyRelations | null {
  if (defs == null || item == null) return null;
  const level = levelOf(item);
  const id = item[idField];

  const siblings = defs.filter(
    (d) =>
      d[idField] !== id && levelOf(d) === level && sharesPath(d, item, level)
  );

  const children: any[] = [];
  const groups = new Map<string, any[]>();
  if (level < LEAF_LEVEL) {
    for (const d of defs) {
      if (d[idField] === id) continue;
      if (parentOf(defs, d)?.[idField] !== id) continue;
      // A child whose own path passes through a stripped level belongs under that
      // level's name, not directly under this item: `sedimentary` shouldn't list
      // `coal` as an immediate child when `organic` sits between them.
      const stripped = strippedLevelBetween(item, d);
      if (stripped == null) {
        children.push(d);
      } else {
        const existing = groups.get(stripped) ?? [];
        existing.push(d);
        groups.set(stripped, existing);
      }
    }
  }

  const childGroups = Array.from(groups.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ancestors: ancestorsOf(defs, item),
    siblings,
    children,
    childGroups,
  };
}

interface LexItemHierarchyProps {
  type: string;
  id: number | string;
  /** The item's own record — its `class`/`type`/`group` locate it in the tree. */
  resData: any;
}

export function LexItemHierarchy(props: LexItemHierarchyProps) {
  const { type, id, resData } = props;
  const hasHierarchy = lexTypeHasHierarchy(type);
  // Hook order stays stable: pass a non-type when there's nothing to load.
  const defs = useLexDefs(hasHierarchy ? type : "");
  const idField = lexTypeConfig(type)?.idParam;
  const activeId = Number(id);

  // Prefer the definition-list copy of the record, so identity comparisons below
  // are against the same objects the relations are computed from.
  const item = useMemo(() => {
    return defs?.find((d) => d[idField] === activeId) ?? resData ?? null;
  }, [defs, idField, activeId, resData]);

  const relations = useMemo(() => {
    return lexHierarchyRelations(defs, item, idField);
  }, [defs, item, idField]);

  if (!hasHierarchy || relations == null) return null;

  const { ancestors, siblings, children, childGroups } = relations;
  const isEmpty =
    ancestors.length === 0 &&
    siblings.length === 0 &&
    children.length === 0 &&
    childGroups.length === 0;
  if (isEmpty) return null;

  return h(
    "div.lex-hierarchy",
    h(ExpansionPanel, { title: "Hierarchy", expanded: true }, [
      h(RelationRow, { label: "Parents", items: ancestors, separator: true }),
      h(RelationRow, { label: "Siblings", items: siblings }),
      h(ChildrenRows, { children, childGroups }),
    ])
  );
}

/** The children row, plus a collapsed chip per stripped level. Those groups are a
 * level further out than the immediate children, so they're revealed on demand
 * instead of flattening the distinction away. */
function ChildrenRows({
  children,
  childGroups,
}: {
  children: any[];
  childGroups: LexChildGroup[];
}) {
  const [expanded, setExpanded] = useState<string[]>([]);

  if (children.length === 0 && childGroups.length === 0) return null;

  function toggle(name: string) {
    setExpanded((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      return [...prev, name];
    });
  }

  const groupChips = childGroups.map((group) => {
    const isOpen = expanded.includes(group.name);
    let icon = "caret-right";
    if (isOpen) icon = "caret-down";
    return h(
      Button,
      {
        key: group.name,
        minimal: true,
        small: true,
        active: isOpen,
        rightIcon: icon,
        className: "group-chip",
        onClick: () => toggle(group.name),
      },
      `${group.name} (${group.items.length})`
    );
  });

  const openGroups = childGroups
    .filter((group) => expanded.includes(group.name))
    .map((group) =>
      h(RelationRow, {
        key: group.name,
        label: group.name,
        items: group.items,
        className: "group-row",
      })
    );

  return h("div.children-block", [
    h("div.relation-row", [
      h("div.relation-label", "Children"),
      h("div.relation-items", [
        children.map((data, i) => h(MacrostratHierarchyItem, { key: i, data })),
        groupChips,
      ]),
    ]),
    openGroups,
  ]);
}

/** One labeled row of hierarchy items. `separator` renders the ancestry as a
 * path (outermost first) rather than an unordered set. */
function RelationRow({
  label,
  items,
  separator = false,
  className,
}: {
  label: string;
  items: any[];
  separator?: boolean;
  className?: string;
}) {
  if (items.length === 0) return null;

  const nodes = [];
  items.forEach((data, i) => {
    if (separator && i > 0) {
      nodes.push(h("span.path-separator", { key: `sep-${i}` }, "›"));
    }
    nodes.push(h(MacrostratHierarchyItem, { key: i, data }));
  });

  return h("div.relation-row", { className }, [
    h("div.relation-label", label),
    h("div.relation-items", nodes),
  ]);
}
