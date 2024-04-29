import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { TreeNodeData } from "./nest-data";
import { LithologySwatch } from "./swatch";
import { LithologyTag } from "~/components";

const h = hyper.styled(styles);

export default function Hierarchy({ data }: { data: TreeNodeData }) {
  return h(Tree, { data, level: 0 });
}

function Tree({ data, level = 0 }: { data: TreeNodeData; level: number }) {
  const headerEl = "h" + (level + 2);
  const [subTrees, nodes] = divideChildren(data);

  return h("div.tree", { className: `tree-level-${level}` }, [
    h.if(data.lith == null)(headerEl, capitalize(data.name)),
    h("div.inner", [
      h.if(nodes.length > 0)(
        "ul.nodes",
        nodes.map((d) =>
          h("li", { key: d.name }, [h(LithologyTag, { data: d.lith ?? d })])
        )
      ),
      subTrees.map((d, i) => h(Tree, { key: i, data: d, level: level + 1 })),
    ]),
  ]);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function divideChildren(data: TreeNodeData) {
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
