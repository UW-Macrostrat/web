import { hyperStyled } from "@macrostrat/hyper";
import { Tooltip2 as Tooltip } from "@blueprintjs/popover2";
import { Spinner, Tag } from "@blueprintjs/core";
import pg, { usePostgrest } from "../db";
import styles from "./comp.module.scss";
import { EnvironUnit, LithUnit } from "..";

const h = hyperStyled(styles);

interface tagInfo {
  name: string;
  description: string;
  color: string;
  id?: number;
}

interface tagBody extends tagInfo {
  onClickDelete?: (e: number) => void;
  onClick?: (e: tagInfo) => void | null;
  disabled?: boolean;
  isEditing?: boolean;
}

export function isTooDark(hexcolor: string) {
  var r = parseInt(hexcolor.substr(1, 2), 16);
  var g = parseInt(hexcolor.substr(3, 2), 16);
  var b = parseInt(hexcolor.substr(4, 2), 16);
  var yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq < 90;
}

/**
 *
 * @param props: tagBody
 * @returns
 */
function TagBody(props: tagBody) {
  const {
    name,
    description,
    color,
    onClick = (e: tagInfo) => {},
    onClickDelete = () => {},
    isEditing = false,
    id = 10000,
    disabled = false,
  } = props;

  const showName = name.length > 0 ? name : "Tag Preview";
  const darkTag = isTooDark(color);

  const textColor = darkTag ? "white" : "black";

  let tag: tagInfo = { id, name, description, color };

  const onRemove = () => {
    onClickDelete(tag.id || 0);
  };

  return h(Tooltip, { content: description, disabled }, [
    h(
      Tag,
      {
        key: id,
        large: true,
        round: true,
        className: styles.tag,
        onRemove: isEditing ? onRemove : undefined,
        onClick: (e) => onClick(tag),
        interactive: props.onClick != null,
        style: { backgroundColor: color, color: textColor },
      },
      [showName]
    ),
  ]);
}

function LithTagsAdd(props: { onClick: (e: Partial<LithUnit>) => void }) {
  const liths: Partial<LithUnit>[] = usePostgrest(pg.from("liths"));
  if (!liths) return h(Spinner);

  const data: tagInfo[] = liths.map((lith, i) => {
    return {
      id: lith.id || 0,
      color: lith.lith_color || "fffff",
      name: lith.lith || "None",
      description: lith.lith_class || "None",
    };
  });

  return h("div.tag-popover", [
    data.map((d, i) => {
      const onClick = () => props.onClick(liths[i]);
      return h(TagBody, { ...d, key: i, onClick });
    }),
  ]);
}

function EnvTagsAdd(props: { onClick: (e: Partial<EnvironUnit>) => void }) {
  const envs: Partial<EnvironUnit>[] = usePostgrest(pg.from("environs"));
  if (!envs) return h(Spinner);

  const data: tagInfo[] = envs.map((env, i) => {
    return {
      id: env.id || 0,
      color: env.environ_color || "fffff",
      name: env.environ || "None",
      description: env.environ_class || "None",
    };
  });

  return h("div.tag-popover", [
    data.map((d, i) => {
      const onClick = () => props.onClick(envs[i]);
      return h(TagBody, { ...d, key: i, onClick });
    }),
  ]);
}

interface TagCellProps {
  data: tagInfo[];
  disabled?: boolean;
  isEditing?: boolean;
  onClick?: (e: tagInfo) => void | null;
  onClickDelete?: (e: number) => void;
}

function TagContainerCell(props: TagCellProps) {
  return h("div", [
    props.data.map((tag, i) => {
      const { id, name, color, description } = tag;
      return h(TagBody, {
        key: i,
        id,
        color,
        onClick: props.onClick,
        isEditing: props.isEditing,
        onClickDelete: props.onClickDelete,
        name,
        description,
      });
    }),
  ]);
}

export { TagBody, TagContainerCell, EnvTagsAdd, LithTagsAdd };
