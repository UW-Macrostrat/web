import { MouseEventHandler } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Tooltip2 as Tooltip } from "@blueprintjs/popover2";
import { Button, MenuItem, Spinner, Tag } from "@blueprintjs/core";
import {
  IItemModifiers,
  ItemPredicate,
  ItemRenderer,
} from "@blueprintjs/select";
import pg, { usePostgrest } from "../db";
import styles from "./comp.module.scss";
import { EnvironUnit, LithUnit } from "..";
import { ItemSelect } from "./suggest";

const h = hyperStyled(styles);

interface SelectDataI {
  data: any;
  value: any;
}

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
  large?: boolean;
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
    large = true,
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
        large,
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

interface LithMenuItemProps {
  data: { name: string; color: string };
  modifiers?: IItemModifiers;
  handleClick: MouseEventHandler<HTMLElement>;
}

export function LithMenuItem(props: LithMenuItemProps) {
  const { modifiers, handleClick, data } = props;

  const style =
    modifiers?.active ?? false
      ? {
          marginBottom: "2px",
        }
      : {
          backgroundColor: data.color + "40", // add opaquness
          marginBottom: "2px",
        };

  return h(MenuItem, {
    active: modifiers?.active,
    text: data.name,
    onClick: handleClick,
    style,
  });
}

const lithItemRenderer: ItemRenderer<SelectDataI> = (
  item: SelectDataI,
  { handleClick, index, modifiers }
) => {
  const { value, data } = item;

  return h(LithMenuItem, { key: index, data, modifiers, handleClick });
};

const itemPredicate: ItemPredicate<SelectDataI> = (query, item, index) => {
  const {
    data: { name },
  } = item;

  return name?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

function LithTagsAdd(props: { onClick: (e: Partial<LithUnit>) => void }) {
  const liths: Partial<LithUnit>[] = usePostgrest(pg.from("liths"));
  if (!liths) return null;

  const data: { data: any; value: any }[] = liths.map((lith, i) => {
    return {
      data: {
        id: lith.id || 0,
        color: lith.lith_color || "fffff",
        name: lith.lith || "None",
        description: lith.lith_class || "None",
      },
      value: { ...lith, type: "dom" },
    };
  });

  return h(
    ItemSelect,
    {
      filterable: true,
      items: data,
      itemRenderer: lithItemRenderer,
      itemPredicate,
      position: "bottom-left",
      onItemSelect: (item: SelectDataI) => {
        props.onClick(item.value);
      },
    },
    [h(Button, { icon: "plus", minimal: true, intent: "success" })]
  );
}

const envItemRenderer: ItemRenderer<SelectDataI> = (
  item: SelectDataI,
  { handleClick, index, modifiers }
) => {
  const { value, data } = item;

  const style = modifiers.active
    ? {
        marginBottom: "2px",
      }
    : {
        backgroundColor: data.color + "40", // add opaquness
        marginBottom: "2px",
      };

  return h(MenuItem, {
    active: modifiers.active,
    key: index,
    text: data.name,
    onClick: handleClick,
    style,
  });
};
function EnvTagsAdd(props: { onClick: (e: Partial<EnvironUnit>) => void }) {
  const envs: Partial<EnvironUnit>[] = usePostgrest(pg.from("environs"));
  if (!envs) return null;

  const data: SelectDataI[] = envs.map((env, i) => {
    return {
      data: {
        id: env.id || 0,
        color: env.environ_color || "fffff",
        name: env.environ || "None",
        description: env.environ_class || "None",
      },
      value: env,
    };
  });

  return h(
    ItemSelect,
    {
      filterable: true,
      items: data,
      itemRenderer: envItemRenderer,
      itemPredicate,
      position: "bottom-left",
      onItemSelect: (item: SelectDataI) => props.onClick(item.value),
    },
    [h(Button, { icon: "plus", minimal: true, intent: "success" })]
  );
}

interface TagCellProps {
  data: tagInfo[];
  disabled?: boolean;
  isEditing?: boolean;
  onClick?: (e: tagInfo) => void | null;
  onClickDelete?: (e: number) => void;
  large?: boolean;
}

function TagContainerCell(props: TagCellProps) {
  const { large = true } = props;
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
        large,
      });
    }),
  ]);
}

export { TagBody, TagContainerCell, EnvTagsAdd, LithTagsAdd };
