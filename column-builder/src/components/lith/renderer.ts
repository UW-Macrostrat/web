import { useState, useRef, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { LithUnit } from "~/types";
import { mergeRefs, Tag } from "@blueprintjs/core";
import { Tooltip2, Popover2 } from "@blueprintjs/popover2";
import styles from "./lith.module.scss";

const h = hyperStyled(styles);

interface LithContainerProps {
  liths?: LithUnit[];
  onRemove?: (l: LithUnit) => void;
  large: boolean;
}

function LithContainer(props: LithContainerProps) {
  const { liths = [] } = props;
  return h("div.lith-segment-container", [
    liths.map((lith) => {
      return h(LithSegment, {
        lith,
        onRemove: props.onRemove,
        large: props.large,
      });
    }),
  ]);
}

function LithSegmentToolTipContent(props: { lith: LithUnit }) {
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
  lith: LithUnit;
  onRemove?: (l: LithUnit) => void;
  large: boolean;
}) {
  const [curWidth, setCurWidth] = useState(0);
  const widthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (widthRef.current) setCurWidth(widthRef.current.offsetWidth);
  }, [widthRef.current]);

  const width = `${props.lith.mod_prop * 100}%`;
  const style = {
    backgroundColor: props.lith.lith_color,
    width,
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
          elementRef: mergeRefs(ref, widthRef),
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

export { LithContainer };
