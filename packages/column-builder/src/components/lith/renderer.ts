import { hyperStyled } from "@macrostrat/hyper";
import { Lith, LithUnit } from "~/types";
import { Tag } from "@blueprintjs/core";
import { Tooltip } from "@blueprintjs/core";
import styles from "./lith.module.scss";
import classNames from "classnames";
import type { ReactNode } from "react";

const h = hyperStyled(styles);

const getLithProportions = (liths: LithUnit[]) => {
  if (liths.length == 0) return [1, 1];

  let dom_count = 0;
  let sub_count = 0;

  liths.map((lith) => {
    if (lith.dom == "dom") dom_count++;
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
    liths.map((lith, i) => {
      return h(LithSegment, {
        key: i,
        lith,
        onRemove: props.onRemove,
        large: props.large,
        width: lith.dom == "dom" ? dom_prop * 100 : sub_prop * 100,
      });
    }),
  ]);
}

function LithSegmentToolTipContent(props: { lith: LithUnit | Lith }) {
  return h("div.segment-tooltip", [
    h("span", [
      h("b", [props.lith.lith]),
      " ",
      h("i", ["(", props.lith.dom, ")"]),
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
    display: "flex",
    justifyContent: "space-around",
    position: "relative",
  };

  const className = classNames("lith-segment", {
    large: props.large,
    small: !props.large,
  });

  return h(
    "div",
    { style, className },
    h(
      Tooltip,
      {
        position: "top",
        content: h(LithSegmentToolTipContent, { lith: props.lith }),
      },
      h(
        Tag,
        {
          style: {
            borderRadius: 0,
          },
          onRemove: (evt) => {
            props.onRemove?.(props.lith);
            evt?.stopPropagation();
          },
        },
        props.lith.lith
      ) 
    )
  );
}

export { LithSegmentContainer, LithSegment };
