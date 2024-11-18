import { hyperStyled } from "@macrostrat/hyper";
import { Lith } from "../../types";
import { LithMenuItem } from "../tag";
import styles from "./lith.module.scss";
import {
  QueryList,
  ItemRenderer,
  IQueryListRendererProps,
  ItemPredicate,
} from "@blueprintjs/select";
import pg, { usePostgrest } from "../../db";
import { InputGroup } from "@blueprintjs/core";

const h = hyperStyled(styles);

const LithQueryList = QueryList.ofType<Lith>();

const itemPredicate: ItemPredicate<Lith> = (query, item, index) => {
  const { lith } = item;

  return lith?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

const LithItemRenderer: ItemRenderer<Lith> = (
  item: Lith,
  { handleClick, index, modifiers }
) => {
  return h(LithMenuItem, {
    key: index,
    data: { name: item.lith, color: item.lith_color },
    modifiers,
    handleClick,
  });
};

const LithQueryListRenderer = (props: IQueryListRendererProps<Lith>) => {
  const { itemList, handleKeyDown, handleKeyUp, ...listProps } = props;

  return h(
    "div.lith-query-list-renderer",
    { onKeyDown: handleKeyDown, onKeyUp: handleKeyUp },
    [
      h(InputGroup, {
        ["aria-autocomplete"]: "list",
        leftIcon: "search",
        placeholder: "Add a lithology...",
        onChange: listProps.handleQueryChange,
        value: listProps.query,
      }),
      itemList,
    ]
  );
};

interface LithSelectProps {
  onItemSelect: (l: Lith) => void;
}

function LithSelect(props: LithSelectProps) {
  const liths: Lith[] = usePostgrest(pg.from("liths"));
  if (!liths) return null;

  return h(LithQueryList, {
    itemRenderer: LithItemRenderer,
    itemPredicate,
    onItemSelect: props.onItemSelect,
    items: liths,
    renderer: LithQueryListRenderer,
    resetOnSelect: true,
    menuProps: { style: { maxWidth: "100%", margin: "0 10px" } },
  });
}

export { LithSelect };
