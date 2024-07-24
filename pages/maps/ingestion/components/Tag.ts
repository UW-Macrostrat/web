import {
  Icon,
  Tag as BlueprintTag,
  TagProps as BlueprintTagProps,
} from "@blueprintjs/core";
import { ComponentType, HTMLAttributes, ReactNode } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import styles from "./tag.module.sass";

const h = hyper.styled(styles);

function hashCode(str: string) {
  // java String#hashCode
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function intToRGB(i: number) {
  let c = (i & 0x00ffffff).toString(16).toUpperCase();

  return "#0000000".substring(0, 7 - c.length) + c;
}

interface TagProps extends BlueprintTagProps {
  value: string;
  color?: string;
  active?: boolean;
  onClick?: () => Promise<void>;
}

const Tag = ({ value, color, onClick, active, ...props }: TagProps) => {
  color = color ? color : intToRGB(hashCode(value));

  return h(
    BlueprintTag,
    {
      ...props,
      className: "ingest-tag",
      onClick: onClick,
      style: { backgroundColor: color, ...props?.style },
    },
    [
      h("div.ingest-tag", { style: { display: "flex" } }, [
        value,
        h.if(active)(Icon, {
          icon: "small-tick",
          style: { marginLeft: "auto" },
          iconSize: 16,
        }),
      ]),
    ]
  );
};

export default Tag;
export type { TagProps };
