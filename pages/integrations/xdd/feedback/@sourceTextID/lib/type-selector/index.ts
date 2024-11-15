/**
 * Entity type selector
 */

import h from "./main.module.sass";
import classNames from "classnames";
import { Omnibar, OmnibarProps } from "@blueprintjs/select";
import "@blueprintjs/select/lib/css/blueprint-select.css";

interface TagItemProps<T> {
  selected: boolean;
  active: boolean;
  className?: string;
  item: T;

  onSelect(t: T): void;

  children?: React.ReactElement;
}

const TagListItem: React.ComponentType<TagItemProps<T>> = (props) => {
  /** Render a tag for the omnibox list */
  let { active, selected, className, onSelect, item, children } = props;
  className = classNames({ active, selected }, className);
  const onClick = () => onSelect(item);

  return h(
    "div.item-container",
    {
      key: item.id,
      className,
      onClick,
    },
    [
      h("div.swatch", { style: { backgroundColor: item.color } }),
      h("div.item", {}, item.name),
    ]
  );
};

type BoxLifecycleProps<T> = Pick<OmnibarProps<T>, "onClose" | "isOpen">;

interface OmniboxProps<T, ID = number | string> extends BoxLifecycleProps<T> {
  items: T[];
  selectedItem: T;
  onSelectItem: (t: T) => void;
  listItemComponent?: React.ComponentType<TagItemProps<T>>;
}

export function OmniboxSelector<T>(props: OmniboxProps<T>) {
  /** A general omnibox for annotation types */
  const { onSelectItem, items, isOpen, onClose } = props;

  return h(Omnibar, {
    onItemSelect: onSelectItem,
    items,
    resetOnSelect: false,
    isOpen,
    onClose,
    itemRenderer(item, { handleClick, modifiers }) {
      return h(TagListItem, {
        key: item.id,
        item,
        onSelect: handleClick,
        active: modifiers.active,
        selected: modifiers.active,
      });
    },
  });
}
