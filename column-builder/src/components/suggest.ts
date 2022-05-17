import { ReactChild, useState } from "react";
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

export interface DataI {
  value: string;
  data: any;
}

interface SuggestI {
  onChange: (e: DataI) => void;
  initialSelected?: DataI;
  items: DataI[];
  onQueryChange?: (e: string) => void;
  placeholder?: string;
}
const ItemSuggestComponent = Suggest.ofType<any>();

function ItemSuggest(props: SuggestI) {
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

  const itemRenderer: ItemRenderer<DataI> = (
    item: DataI,
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

  const itemPredicate: ItemPredicate<DataI> = (query: string, item: DataI) => {
    const { value } = item;

    return value?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item: DataI) => {
    setSelected(item);
    props.onChange(item);
  };

  return h(ItemSuggestComponent, {
    inputValueRenderer: (item: DataI) => item.value,
    items: itemz,
    popoverProps: {
      minimal: true,
    },
    inputProps: {
      placeholder: props.placeholder,
    },
    selectedItem: selected,
    onItemSelect: onItemSelect,
    itemRenderer: itemRenderer,
    itemPredicate: itemPredicate,
    onQueryChange: props.onQueryChange,
    resetOnQuery: true,
    noResults: h(MenuItem, { disabled: true, text: "No Results" }),
  });
}

interface ItemSelectI {
  items: DataI[];
  onItemSelect: (e: DataI) => void;
  children: ReactChild;
  itemRenderer?: ItemRenderer<DataI>;
  itemPredicate?: ItemPredicate<DataI>;
  itemListRenderer?: ItemListRenderer<DataI>;
  filterable?: boolean;
  position?: PopoverPosition;
}

const ItemSelectComponent = Select.ofType<DataI>();

const itemRenderer: ItemRenderer<DataI> = (
  item: DataI,
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

const itemPredicate: ItemPredicate<DataI> = (query, item, _index) => {
  const { value } = item;

  return value?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

function ItemSelect(props: ItemSelectI) {
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
