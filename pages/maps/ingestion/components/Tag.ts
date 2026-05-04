import {
  Icon,
  Tag as BlueprintTag,
  TagProps as BlueprintTagProps,
} from "@blueprintjs/core";
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
  onRemove?: () => void;
}

const Tag = ({
  value,
  color,
  onClick,
  onRemove,
  active,
  ...props
}: TagProps) => {
  color = color ? color : intToRGB(hashCode(value));

  return h(
  BlueprintTag,
  {
    ...props,
    className: "ingest-tag",
    onClick,
    style: {
      backgroundColor: color,
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      maxWidth: "100%",
      whiteSpace: "normal",
      ...props?.style,
    },
  },
  [
    h(
      "div.ingest-tag-content",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          width: "fit-content",
          maxWidth: "100%",
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        },
      },
      [
        value,
        h.if(active)(Icon, {
          icon: "small-tick",
          style: { marginLeft: "auto" },
          iconSize: 16,
        }),
        h.if(onRemove != null)(
          "button.ingest-tag-remove",
          {
            type: "button",
            title: "Remove tag",
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove?.();
            },
          },
          "×"
        )
      ]
    ),
  ]
);
};

export default Tag;
export type { TagProps };
