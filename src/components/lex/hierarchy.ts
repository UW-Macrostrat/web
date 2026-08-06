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
 * "plutonic"` has a lithology called "plutonic"; `group: "felsic"` has none). Such
 * a level can't be a **link**, but it is still shown: the ancestry path renders it
 * as plain text, because it's part of where the item sits (`peritidal` is a marine
 * *carbonate* environment even with no record named "carbonate"). For relations,
 * though, it is stripped — descendants below it belong to the nearest level that
 * does have a record, gathered behind that level's name.
 *
 * Presentation is a **single inline strip of tags** — `Parents a › b   Siblings …
 * Children …` — quiet labels as the section cues, a hairline before the
 * descendants, and long runs capped so they slide out inline instead of growing
 * the page. Only one expansion is open at a time. Links resolve through the
 * ambient `MacrostratInteractionProvider` like every other lexicon link. See
 * [[Geologic lexicon pages]].
 */
import hyper from "@macrostrat/hyper";
import styles from "./hierarchy.module.sass";
import { useMemo, useState } from "react";
import { Icon } from "@blueprintjs/core";
import type { ReactNode } from "react";
import { Tag, TagSize, useInteractionProps } from "@macrostrat/data-components";
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

export interface LexAncestor {
  /** The level's value (`"sedimentary"`, `"carbonate"`). */
  name: string;
  /** The record that *is* this level, or `null` when nothing is named after it. */
  record: any | null;
}

/**
 * The full ancestry, outermost first — **including levels with no record of their
 * own**. Those can't be links, but leaving them out would misrepresent where the
 * item sits: `peritidal` is a marine *carbonate* environment even though no record
 * is named "carbonate".
 */
function ancestorPath(defs: any[], item: any): LexAncestor[] {
  const path = levelPath(item);
  const out: LexAncestor[] = [];
  for (let i = 0; i < levelOf(item); i++) {
    const name = path[i];
    if (name == null) continue;
    out.push({ name, record: itemForLevel(defs, item, i) });
  }
  return out;
}

/** The nearest ancestor that exists as a record — the item's parent once
 * non-navigable levels are stripped. */
function parentOf(defs: any[], item: any): any | null {
  const withRecords = ancestorPath(defs, item).filter((a) => a.record != null);
  return withRecords[withRecords.length - 1]?.record ?? null;
}

export interface LexChildGroup {
  /** The stripped level's name — a grouping string with no record of its own. */
  name: string;
  items: any[];
}

export interface LexHierarchyRelations {
  /** Outermost → nearest, including levels that have no record of their own. */
  ancestors: LexAncestor[];
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
    ancestors: ancestorPath(defs, item),
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

/** Above this many peers, the list is capped and the rest slide out on demand. */
const OVERFLOW_THRESHOLD = 8;
/** How many stay visible when capped. */
const COLLAPSED_COUNT = 5;

/**
 * The hierarchy strip: `Parents  a › b   Siblings  …   Children  …`, all in one
 * wrapping inline flow. Every tag, label, and control is a direct child of the
 * flex container — no per-section wrappers — so a long list fills the line and
 * wraps tag by tag instead of breaking as a block.
 *
 * At most one expansion is open at a time (`openSection`), so the strip never
 * balloons in two places at once.
 */
export function LexItemHierarchy(props: LexItemHierarchyProps) {
  const { type, id, resData } = props;
  const hasHierarchy = lexTypeHasHierarchy(type);
  // Hook order stays stable: pass a non-type when there's nothing to load.
  const defs = useLexDefs(hasHierarchy ? type : "");
  const idField = lexTypeConfig(type)?.idParam;
  const activeId = Number(id);
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  function toggle(key: string) {
    setOpenSection((current) => {
      if (current === key) return null;
      return key;
    });
  }

  const nodes = [];

  // No "Parents" label: a `›`-separated path leading into the item's peers reads
  // as ancestry on its own.
  if (ancestors.length > 0) {
    nodes.push(ancestorNodes(ancestors));
  }

  if (siblings.length > 0) {
    nodes.push(h("span.relation-label", { key: "l-siblings" }, "Siblings"));
    nodes.push(
      peerNodes("siblings", siblings, openSection === "siblings", toggle)
    );
  }

  if (children.length > 0 || childGroups.length > 0) {
    nodes.push(
      h("span.relation-label.leads", { key: "l-children" }, "Children")
    );
    nodes.push(
      peerNodes("children", children, openSection === "children", toggle)
    );
    childGroups.forEach((group) => {
      nodes.push(groupNodes(group, openSection === groupKey(group), toggle));
    });
  }

  return h("div.lex-hierarchy", nodes);
}

function groupKey(group: LexChildGroup): string {
  return `group:${group.name}`;
}

/** The ancestry as a `›`-separated path. Levels with no record of their own are
 * still shown — as plain text rather than a link — because they're what locates
 * the item (`marine › carbonate`, even though no record is named "carbonate"). */
function ancestorNodes(ancestors: LexAncestor[]) {
  const nodes = [];
  ancestors.forEach((ancestor, i) => {
    if (i > 0) nodes.push(h("span.path-separator", { key: `sep-${i}` }, "›"));
    if (ancestor.record == null) {
      nodes.push(h("span.unfilled-level", { key: `anc-${i}` }, ancestor.name));
    } else {
      nodes.push(h(HierarchyTag, { key: `anc-${i}`, data: ancestor.record }));
    }
  });
  return nodes;
}

/** A run of peer tags, capped once the list gets long: the first
 * `COLLAPSED_COUNT` stay visible and the rest slide out inline from a `+N`
 * button, rather than pushing the page down. */
function peerNodes(
  key: string,
  items: any[],
  isOpen: boolean,
  toggle: (key: string) => void
) {
  if (items.length === 0) return null;
  const overflows = items.length > OVERFLOW_THRESHOLD;

  let visible = items;
  if (overflows && !isOpen) {
    visible = items.slice(0, COLLAPSED_COUNT);
  }

  const nodes = visible.map((data, i) => {
    // Only the items past the cap animate in; the always-visible ones must not,
    // or they'd re-animate on every toggle. The stagger counts from the first
    // revealed item, so the unfurl starts at the button.
    const isRevealed = isOpen && i >= COLLAPSED_COUNT;
    return h(HierarchyTag, {
      key: `${key}-${i}`,
      data,
      revealed: isRevealed,
      index: i - COLLAPSED_COUNT,
    });
  });

  if (overflows && !isOpen) {
    nodes.push(
      h(TextControl, {
        key: `${key}-toggle`,
        onClick: () => toggle(key),
        children: `and ${items.length - COLLAPSED_COUNT} more…`,
      })
    );
  }

  if (overflows && isOpen) {
    nodes.push(
      h(CollapseControl, { key: `${key}-collapse`, onClick: () => toggle(key) })
    );
  }

  return nodes;
}

/** A stripped level: an italic text label whose members slide out beside it. Flat
 * nodes, not a wrapper, so the members share the strip's flow. */
function groupNodes(
  group: LexChildGroup,
  isOpen: boolean,
  toggle: (key: string) => void
) {
  const key = groupKey(group);
  const nodes = [
    h(TextControl, {
      key: `${key}-chip`,
      active: isOpen,
      onClick: () => toggle(key),
      children: group.name,
    }),
  ];

  if (!isOpen) return nodes;

  group.items.forEach((data, i) => {
    nodes.push(
      h(HierarchyTag, { key: `${key}-${i}`, data, revealed: true, index: i })
    );
  });
  nodes.push(
    h(CollapseControl, { key: `${key}-collapse`, onClick: () => toggle(key) })
  );

  return nodes;
}

/**
 * A control that reads as text, not as a button: no background, no border, italic
 * and secondary, so the strip stays a list of tags with quiet asides in it. Used
 * for "and N more…" and for a stripped level's name — clicking is the affordance,
 * which is why neither needs an icon.
 */
function TextControl({
  onClick,
  children,
  active = false,
}: {
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  // Class names go in the tag string so `hyper.styled` scopes them; passed as a
  // `className` prop they'd stay unscoped and match nothing here.
  let tag = "button.text-control";
  if (active) tag = "button.text-control.is-active";
  return h(tag, { type: "button", onClick }, children);
}

/** Icon-only control that closes an expanded run, sitting after its last item. */
function CollapseControl({ onClick }: { onClick: () => void }) {
  return h(
    "button.text-control.collapse-control",
    { type: "button", onClick, "aria-label": "Collapse" },
    h(Icon, { icon: "chevron-left", size: 12 })
  );
}

/**
 * A hierarchy item as a plain tag: the item's color, its name, and nothing else —
 * no identifier, since a dozen of these in a row is a navigation aid, not a data
 * table. Links resolve through the ambient `MacrostratInteractionProvider`.
 */
function HierarchyTag({
  data,
  revealed = false,
  index = 0,
}: {
  data: any;
  revealed?: boolean;
  index?: number;
}) {
  const interactionProps = useInteractionProps(data);
  const tag = h(Tag, {
    name: data.name,
    color: data.color,
    size: TagSize.Small,
    ...interactionProps,
  });

  if (!revealed) {
    return h("span.tag-holder", tag);
  }

  // Stagger the slide-out slightly so a long run reads as unfurling.
  const step = Math.max(0, Math.min(index, 12));
  return h(
    "span.tag-holder.revealed",
    { style: { animationDelay: `${step * 25}ms` } },
    tag
  );
}
