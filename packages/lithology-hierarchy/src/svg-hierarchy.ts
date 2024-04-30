import h from "@macrostrat/hyper";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { hierarchy, Tree } from "@visx/hierarchy";
import { pointRadial } from "d3-shape";
import { useState, useRef, createElement } from "react";
import { getLinkComponent, LinkControls } from "./Controls";
import { useElementSize } from "@macrostrat/ui-components";
import { TreeNode } from "./nest-data";
import { LithologySwatch } from "./swatch";

function useForceUpdate() {
  const [, setValue] = useState<number>(0);
  return () => setValue((value) => value + 1); // update state to force render
}

const defaultMargin = { top: 30, left: 30, right: 30, bottom: 70 };

export type LinkTypesProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  data: TreeNode;
};

export default function Hierarchy({
  data,
  width: totalWidth,
  height: totalHeight,
  margin = defaultMargin,
}: LinkTypesProps) {
  const [layout, setLayout] = useState<string>("cartesian");
  const [orientation, setOrientation] = useState<string>("horizontal");
  const [linkType, setLinkType] = useState<string>("diagonal");
  const [stepPercent, setStepPercent] = useState<number>(0.5);
  const forceUpdate = useForceUpdate();

  const innerWidth = totalWidth - margin.left - margin.right;
  const innerHeight = totalHeight - margin.top - margin.bottom;

  let origin: { x: number; y: number };
  let sizeWidth: number;
  let sizeHeight: number;

  if (layout === "polar") {
    origin = {
      x: innerWidth / 2,
      y: innerHeight / 2,
    };
    sizeWidth = 2 * Math.PI;
    sizeHeight = Math.min(innerWidth, innerHeight) / 2;
  } else {
    origin = { x: 0, y: 0 };
    if (orientation === "vertical") {
      sizeWidth = innerWidth;
      sizeHeight = innerHeight;
    } else {
      sizeWidth = innerHeight;
      sizeHeight = innerWidth;
    }
  }

  const LinkComponent = getLinkComponent({ layout, linkType, orientation });

  if (totalWidth < 10) return null;

  return h("div", {}, [
    h(LinkControls, {
      layout,
      orientation,
      linkType,
      stepPercent,
      setLayout,
      setOrientation,
      setLinkType,
      setStepPercent,
    }),
    h("svg", { width: totalWidth, height: totalHeight }, [
      h(LinearGradient, {
        id: "links-gradient",
        from: "#fd9b93",
        to: "#fe6e9e",
      }),
      h("rect", {
        width: totalWidth,
        height: totalHeight,
        rx: 14,
        fill: "#272b4d",
      }),
      h(Group, { top: margin.top, left: margin.left }, [
        h(
          Tree,
          {
            root: hierarchy(data, (d) => (d.isExpanded ? null : d.children)),
            size: [sizeWidth, sizeHeight],
            separation: (a, b) => (a.parent === b.parent ? 1 : 0.5) / a.depth,
          },
          (tree) => {
            return h(Group, { top: origin.y, left: origin.x }, [
              h(
                Group,
                { className: "links" },
                tree.links().map((link, i) =>
                  h(LinkComponent, {
                    key: i,
                    data: link,
                    percent: stepPercent,
                    stroke: "rgb(254,110,158,0.6)",
                    strokeWidth: "1",
                    fill: "none",
                  })
                )
              ),
              h(
                Group,
                { className: "nodes" },
                tree.descendants().map((node, key) => {
                  return h(Node, {
                    layout,
                    orientation,
                    node,
                    key,
                    forceUpdate,
                  });
                })
              ),
            ]);
          }
        ),
      ]),
    ]),
  ]);
}

enum DisplayType {
  CARTESIAN = "cartesian",
  POLAR = "polar",
}

function Node({ layout, orientation, node, key, forceUpdate }) {
  const width = 40;
  const height = 20;

  let top: number;
  let left: number;
  if (layout === "polar") {
    const [radialX, radialY] = pointRadial(node.x, node.y);
    top = radialY;
    left = radialX;
  } else if (orientation === "vertical") {
    top = node.y;
    left = node.x;
  } else {
    top = node.x;
    left = node.y;
  }

  return h(Group, { top, left, key }, [
    // h("rect", {
    //   height,
    //   width,
    //   y: -height / 2,
    //   x: -width / 2,
    //   fill: "#272b4d",
    //   stroke: node.data.children ? "#03c0dc" : "#26deb0",
    //   strokeWidth: 1,
    //   strokeDasharray: node.data.children ? "0" : "2,2",
    //   strokeOpacity: node.data.children ? 1 : 0.6,
    //   rx: node.data.children ? 0 : 10,
    //   onClick: () => {
    //     node.data.isExpanded = !node.data.isExpanded;
    //     console.log(node);
    //     forceUpdate();
    //   },
    // }),
    // h(
    //   "text",
    //   {
    //     dy: ".33em",
    //     fontSize: 9,
    //     fontFamily: "Arial",
    //     textAnchor: "middle",
    //     style: { pointerEvents: "none" },
    //     fill:
    //       node.depth === 0 ? "#71248e" : node.children ? "white" : "#26deb0",
    //   },
    //   node.data.name
    // ),
    h(LithologySwatch_, { node }),
  ]);
}

function LithologySwatch_({ node }) {
  const ref = useRef(null);
  const { width, height } = useElementSize(ref) ?? {};
  return createElement(
    "foreignObject",
    {
      width: width + 2,
      height: height,
      x: -width / 2,
      y: -height / 2,
      style: { overflow: "visible" },
    },
    h("span", { ref }, [h(LithologySwatch, { node })])
  );
}
