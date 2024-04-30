import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { Tooltip2 } from "@blueprintjs/popover2";

const h = hyper.styled(styles);

export function LithologySwatch({ node, tooltip = false }) {
  if (node == null) {
    return null;
  }
  const content = h(
    "span.lithology-swatch",
    {
      style: {
        backgroundColor: node.color,
      },
    },
    [node.name]
  );

  if (!tooltip) {
    return content;
  }

  return h(Tooltip2, { content }, h(LithologyTooltipPanel, { node }));
}

function LithologyTooltipPanel({ node }) {
  return h("div.lithology-tooltip-panel", [
    h("div.lithology-swatch", {
      style: {
        backgroundColor: node.color,
      },
    }),
    h("div", [node.name]),
  ]);
}
