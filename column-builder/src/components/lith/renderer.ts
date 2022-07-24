import { useState, useRef, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Lith, LithUnit } from "~/types";
import { mergeRefs, Tag, Dialog } from "@blueprintjs/core";
import { Tooltip2, Popover2 } from "@blueprintjs/popover2";
import styles from "./lith.module.scss";

const h = hyperStyled(styles);

const getLithProportions = (liths: LithUnit[]) => {
  if (liths.length == 0) return [1, 1];

  let dom_count = 0;
  let sub_count = 0;

  liths.map((lith) => {
    if (lith.prop == "dom") dom_count++;
    else sub_count++;
  });

  const dom_prop = 5 / (sub_count + dom_count * 5);
  const sub_prop = 1 / (sub_count + dom_count * 5);

  return [dom_prop, sub_prop];
};

interface LithContainerProps {
  liths?: LithUnit[];
  onRemove?: (l: LithUnit) => void;
  large: boolean;
  onClick: () => void;
}

function LithSegmentContainer(props: LithContainerProps) {
  const { liths = [] } = props;

  const [dom_prop, sub_prop] = getLithProportions(liths);
  return h("div.lith-segment-container", { onClick: props.onClick }, [
    liths.map((lith) => {
      return h(LithSegment, {
        key: lith.id,
        lith,
        onRemove: props.onRemove,
        large: props.large,
        width: lith.prop == "dom" ? dom_prop * 100 : sub_prop * 100,
      });
    }),
  ]);
}

function LithSegmentToolTipContent(props: { lith: LithUnit | Lith }) {
  return h("div.segment-tooltip", [
    h("span", [
      h("b", [props.lith.lith]),
      " ",
      h("i", ["(", props.lith.prop, ")"]),
    ]),
    h.if(
      typeof props.lith.lith_group !== "undefined" &&
        props.lith.lith_group != null
    )("span", ["Group: ", h("i", [props.lith.lith_group])]),
    h("span", [props.lith.lith_class, ", ", props.lith.lith_type]),
  ]);
}

function LithSegment(props: {
  lith: LithUnit | Lith;
  onRemove?: (l: LithUnit) => void;
  large: boolean;
  width: number;
}) {
  const { width = 0 } = props;
  const style = {
    backgroundColor: props.lith.lith_color + "70",
    width: width > 0 ? `${width}%` : "100%",
  };

  return h(Tooltip2, {
    position: "top",
    content: h(LithSegmentToolTipContent, { lith: props.lith }),
    renderTarget: ({ isOpen, ref, ...tooltipProps }) =>
      h(
        Tag,
        {
          style: {
            ...style,
            padding: props.large ? "5px 7px" : "2px 6px",
            display: "flex",
            justifyContent: "space-around",
            marginRight: "1px",
            borderRadius: 0,
          },
          onRemove:
            typeof props.onRemove !== "undefined"
              ? //@ts-ignore
                () => props.onRemove(props.lith)
              : undefined,
          elementRef: mergeRefs(ref),
          ...tooltipProps,
        },
        [
          h(`div.lith-segment ${!props.large ? ".small" : ""}`, [
            h("p", [props.lith.lith]),
          ]),
        ]
      ),
  });
}

export { LithSegmentContainer, LithSegment };
