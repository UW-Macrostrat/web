import { ReactChild, useEffect, useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  Suggest,
  ItemRenderer,
  ItemPredicate,
  Select,
  ItemListRenderer,
} from "@blueprintjs/select";
import { MenuItem, Icon, PopoverPosition } from "@blueprintjs/core";
import styles from "./comp.module.scss";

const h = hyperStyled(styles);

export interface DataI<T> {
  value: string;
  data: T;
}

interface SuggestI<T> {
  onChange: (e: DataI<T>) => void;
  initialSelected?: DataI<T>;
  items: DataI<T>[];
  itemRenderer?: ItemRenderer<DataI<T>>;
  onQueryChange?: (e: string) => void;
  placeholder?: string;
}
const ItemSuggestComponent = Suggest.ofType<any>();

function ItemSuggest<T>(props: SuggestI<T>) {
  let itemz = [...props.items];
  //sees if initialSelected is in list, and moves to front
  if (
    props.initialSelected &&
    props.items.map((s) => s.value).includes(props.initialSelected.value)
  ) {
    const spot = itemz.map((s) => s.value).indexOf(props.initialSelected.value);
    itemz.splice(spot, 1);
  }

  itemz = props.initialSelected ? [props.initialSelected, ...itemz] : itemz;

  const [selected, setSelected] = useState(props.initialSelected);

  useEffect(() => {
    setSelected(props.initialSelected);
  }, [props.initialSelected]);

  const itemRenderer: ItemRenderer<DataI<T>> = (
    item: DataI<T>,
    { handleClick, modifiers }
  ) => {
    const { value, data } = item;
    const active = selected?.value == value;
    return h(MenuItem, {
      key: value,
      labelElement: active ? h(Icon, { icon: "tick" }) : null,
      text: value,
      onClick: handleClick,
      active: modifiers.active,
    });
  };

  const itemPredicate: ItemPredicate<DataI<T>> = (
    query: string,
    item: DataI<T>
  ) => {
    const { value } = item;

    return value?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item: DataI<T>) => {
    setSelected(item);
    props.onChange(item);
  };

  return h(ItemSuggestComponent, {
    inputValueRenderer: (item: DataI<T>) => item.value,
    items: itemz,
    popoverProps: {
      minimal: true,
    },
    inputProps: {
      placeholder: props.placeholder,
    },
    selectedItem: selected,
    onItemSelect: onItemSelect,
    itemRenderer: props.itemRenderer ?? itemRenderer,
    itemPredicate: itemPredicate,
    onQueryChange: props.onQueryChange,
    resetOnQuery: true,
    noResults: h(MenuItem, { disabled: true, text: "No Results" }),
  });
}

interface ItemSelectI<T> {
  items: DataI<T>[];
  onItemSelect: (e: DataI<T>) => void;
  children: ReactChild;
  itemRenderer?: ItemRenderer<DataI<T>>;
  itemPredicate?: ItemPredicate<DataI<T>>;
  itemListRenderer?: ItemListRenderer<DataI<T>>;
  filterable?: boolean;
  position?: PopoverPosition;
}

const ItemSelectComponent = Select.ofType<DataI<T>>();

const itemRenderer: ItemRenderer<DataI<T>> = (
  item: DataI<T>,
  { handleClick, index, modifiers }
) => {
  const { value, data } = item;
  return h(MenuItem, {
    key: index,
    text: value,
    onClick: handleClick,
    active: modifiers.active,
  });
};

const itemPredicate: ItemPredicate<DataI<T>> = (query, item, _index) => {
  const { value } = item;

  return value?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

function ItemSelect<T>(props: ItemSelectI<T>) {
  return h(
    ItemSelectComponent,
    {
      filterable: props.filterable || false,
      items: props.items,
      popoverProps: {
        minimal: true,
        position: props.position,
        popoverClassName: styles.itemSelectPopover,
      },
      itemListRenderer: props.itemListRenderer,
      itemRenderer: props.itemRenderer || itemRenderer,
      onItemSelect: props.onItemSelect,
      itemPredicate: props.itemPredicate || itemPredicate,
      noResults: h(MenuItem, { disabled: true, text: "No Results" }),
    },
    [props.children]
  );
}

export { ItemSuggest, ItemSelect };
