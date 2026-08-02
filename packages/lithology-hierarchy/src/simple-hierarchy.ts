import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { TreeNodeData } from "./nest-data";
import { OverlaysProvider } from "@blueprintjs/core";
import { ComponentType } from "react";

const h = hyper.styled(styles);

export interface HierarchyProps<T extends object = any> {
  data: TreeNodeData<T>;
  itemComponent: ComponentType<{ data: T }>;
}

export function Hierarchy<T extends object>(props: HierarchyProps<T>) {
  return h(OverlaysProvider, h(Tree, { ...props, level: 0 }));
}

function Tree<T extends object>({
  data,
  level = 0,
  itemComponent,
}: HierarchyProps<T> & {
  level: number;
}) {
  const headerEl = "h" + (level + 2);
  const [subTrees, nodes] = divideChildren(data);

  return h("div.tree", { className: `tree-level-${level}` }, [
    h("div.main-tree", [
      h.if(data.children != null)(headerEl, capitalize(data.name)),
      h.if(nodes.length > 0)(
        "ul.nodes",
        nodes.map((d) =>
          h("li", { key: d.name }, h(itemComponent, { data: d.data }))
        )
      ),
    ]),
    subTrees.map((d, i) =>
      h(Tree, { key: i, data: d, level: level + 1, itemComponent })
    ),
  ]);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function divideChildren<T extends object>(data: TreeNodeData<T>) {
  /** Divide children into terminal and non-terminal nodes */
  const terminal = [];
  const nonTerminal = [];
  const { children = [] } = data;
  for (const child of children) {
    const len = child.children?.length ?? 0;
    if (len == 0) {
      terminal.push(child);
    } else {
      nonTerminal.push(child);
    }
  }
  return [nonTerminal, terminal];
}
