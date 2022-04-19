import { useState } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import { Suggest, ItemRenderer, ItemPredicate } from "@blueprintjs/select";
import { MenuItem, Icon } from "@blueprintjs/core";
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
}
const MySuggestComponent = Suggest.ofType<any>();

function MySuggest(props: SuggestI) {
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

  const itemRenderer: ItemRenderer<DataI> = (item: DataI, { handleClick }) => {
    const { value, data } = item;
    const active = selected?.value == value;
    return h(MenuItem, {
      key: value,
      labelElement: active ? h(Icon, { icon: "tick" }) : null,
      text: value,
      onClick: handleClick,
      active: active,
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

  return h(MySuggestComponent, {
    inputValueRenderer: (item: DataI) => item.value,
    items: itemz.slice(0, 200),
    popoverProps: {
      minimal: true,
      popoverClassName: styles.mySuggest,
    },
    selectedItem: selected,
    onItemSelect: onItemSelect,
    itemRenderer: itemRenderer,
    itemPredicate: itemPredicate,
    onQueryChange: props.onQueryChange,
    resetOnQuery: true,
  });
}

export { MySuggest };
