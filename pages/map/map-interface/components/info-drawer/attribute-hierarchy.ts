/** Matched lithologies, environments and economic attributes, placed in their
 * class › type hierarchy the way a lexicon page shows an item's ancestry. A
 * few items are shown outright; a long list is summarized by its types until
 * expanded. */
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import {
  DataField,
  ExpandableDetailsPanel,
  LithologyTag,
  Tag,
  TagField,
} from "@macrostrat/data-components";
import { ReactNode, useMemo } from "react";

const h = hyper.styled(styles);

/** Up to this many items are laid out directly */
const DIRECT_LIMIT = 4;

interface HierarchyItem {
  name: string;
  color?: string;
  [key: string]: any;
}

interface HierarchyGroup {
  /** Grouping levels, outermost first */
  path: string[];
  items: HierarchyItem[];
}

export function groupByHierarchy(
  items: HierarchyItem[],
  levelFields: string[]
): HierarchyGroup[] {
  const groups = new Map<string, HierarchyGroup>();
  for (const item of items) {
    const path = hierarchyPath(item, levelFields);
    const key = path.join("›");
    let group = groups.get(key);
    if (group == null) {
      group = { path, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(groups.values()).map(trimLeafLevel);
}

/** The API leaves a level blank or repeats the one above (`igneous › igneous`) */
function hierarchyPath(item: HierarchyItem, levelFields: string[]): string[] {
  const path: string[] = [];
  for (const field of levelFields) {
    const value = item[field];
    if (value == null || value === "") continue;
    if (path[path.length - 1] === value) continue;
    path.push(value);
  }
  return path;
}

/** A level named for the only item under it is that item, not its parent */
function trimLeafLevel(group: HierarchyGroup): HierarchyGroup {
  const { path, items } = group;
  const last = path[path.length - 1];
  if (items.length === 1 && items[0].name === last) {
    return { path: path.slice(0, -1), items };
  }
  return group;
}

export function AttributeHierarchy(props: {
  items: HierarchyItem[];
  levelFields: string[];
}) {
  const { items, levelFields } = props;
  const groups = useMemo(
    () => groupByHierarchy(items, levelFields),
    [items, levelFields]
  );
  return h(
    "div.attribute-hierarchy",
    groups.map((group, i) => h(HierarchyGroupRow, { key: i, group }))
  );
}

function HierarchyGroupRow({ group }: { group: HierarchyGroup }) {
  const nodes: ReactNode[] = [];
  group.path.forEach((name, i) => {
    if (i > 0) nodes.push(h("span.path-separator", { key: `s${i}` }, "›"));
    nodes.push(h("span.hierarchy-level", { key: `l${i}` }, name));
  });
  if (group.path.length > 0) {
    nodes.push(h("span.path-separator", { key: "s-leaf" }, "›"));
  }
  group.items.forEach((item, i) => {
    nodes.push(h(LithologyTag, { key: `t${i}`, data: item }));
  });
  return h("div.hierarchy-group", nodes);
}

interface AttributeFieldProps {
  label: string;
  items: HierarchyItem[];
  /** The higher-level types that summarize a long list */
  types: { name: string; color?: string }[] | null;
  levelFields: string[];
  /** The full list, shown when the summary is expanded */
  children: ReactNode;
}

export function AttributeField(props: AttributeFieldProps) {
  const { label, items, types, levelFields, children } = props;
  if (items == null || items.length === 0) return null;

  if (items.length <= DIRECT_LIMIT) {
    return h(
      DataField,
      { label },
      h(AttributeHierarchy, { items, levelFields })
    );
  }

  return h(
    ExpandableDetailsPanel,
    { headerElement: h(TypesList, { label, data: types }) },
    children
  );
}

/** Higher-level type/class attributes, which may not have IDs of their own */
export function TypesList(props: {
  label: string;
  data: { name: string; color?: string }[] | null;
}) {
  const { data, label } = props;
  if (!data || data.length == 0) return null;

  return h(
    TagField,
    { label },
    data.map((d, i) => {
      let name = d.name;
      if (name == null || name == "") name = "other";
      return h(Tag, { key: i, name, color: d.color ?? "#888" });
    })
  );
}
