import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { TreeNodeData } from "./nest-data";
import { LithologyTag } from "@macrostrat/data-components";
import React, {useMemo} from "react"

const h = hyper.styled(styles);

export default function LexHierarchyInner({ data, href, onClick }: { data: TreeNodeData; href: string; onClick: () => void }) {
  return h(Tree, { data, level: 0, href, onClick });
}

const Tree = React.memo(function Tree({
  data,
  level = 0,
  href,
  onClick,
}: {
  data: TreeNodeData;
  level: number;
  href: string;
  onClick: () => void;
}) {
  const headerEl = "h" + (level + 2);

  const [subTrees, nodes] = useMemo(() => divideChildren(data), [data]);

  return h("div.tree", { className: `tree-level-${level}` }, [
    h("div.main-tree", [
      h.if(data.children != null)(headerEl, capitalize(data.name)),
      h.if(nodes.length > 0)(
        "ul.nodes",
        nodes.map((d) =>
          h("li", { key: d.name }, [
            h(LithologyTag, {
              data: d.lith ?? d,
              href,
              onClick,
            }),
          ])
        )
      ),
    ]),
    subTrees.map((d) =>
      h(Tree, {
        key: d.name,
        data: d,
        level: level + 1,
        href,
        onClick,
      })
    ),
  ]);
});


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
