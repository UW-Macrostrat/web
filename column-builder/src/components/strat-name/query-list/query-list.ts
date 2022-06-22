import { useState, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  QueryList,
  ItemRenderer,
  IQueryListRendererProps,
  ItemPredicate,
} from "@blueprintjs/select";
import pg from "~/db";
import { InputGroup, MenuItem } from "@blueprintjs/core";
import styles from "./strat-name.module.scss";
import {
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from "@supabase/postgrest-js";
import { StratNameI } from "~/types";

const h = hyperStyled(styles);

const StrtaNameQueryList = QueryList.ofType<StratNameI>();

const itemPredicate: ItemPredicate<StratNameI> = (query, item, index) => {
  const { strat_name } = item;

  return strat_name?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

const StratNameItemRenderer: ItemRenderer<StratNameI> = (
  item: StratNameI,
  { handleClick, index, modifiers }
) => {
  const { strat_name, strat_names_meta, rank } = item;

  return h(MenuItem, {
    key: index,
    intent: strat_names_meta ? "primary" : "warning",
    text: `${strat_name} ${rank}`,
    onClick: handleClick,
    active: modifiers.active,
  });
};

const StratNameQueryListRenderer = (
  props: IQueryListRendererProps<StratNameI>
) => {
  const { itemList, handleKeyDown, handleKeyUp, ...listProps } = props;

  return h(
    "div.lith-query-list-renderer",
    { onKeyDown: handleKeyDown, onKeyUp: handleKeyUp },
    [
      h(InputGroup, {
        ["aria-autocomplete"]: "list",
        leftIcon: "search",
        placeholder: "Search for a stratigraphic name",
        onChange: listProps.handleQueryChange,
        value: listProps.query,
      }),
      itemList,
    ]
  );
};

const getStratNames = async (
  query: string,
  setNames: (e: StratNameI[]) => void,
  col_id?: number
) => {
  let baseQuery:
    | PostgrestFilterBuilder<StratNameI>
    | PostgrestQueryBuilder<StratNameI> = pg.from("strat_names");
  if (typeof col_id !== "undefined") {
    baseQuery = pg.rpc("get_strat_names_col_priority", { _col_id: col_id });
  }
  if (query.length > 2) {
    const { data, error } = await baseQuery
      .select("*,strat_names_meta(*,refs(author,pub_year, ref))")
      .ilike("strat_name", `%${query}%`)
      .limit(50);
    setNames(data ?? []);
  } else {
    const { data, error } = await baseQuery
      .select("*,strat_names_meta(*, refs(author,pub_year, ref))")
      .limit(50);
    setNames(data ?? []);
  }
};

interface StratNameSelectProps {
  onItemSelect: (l: StratNameI) => void;
  col_id: number;
}

function StratNameSelect(props: StratNameSelectProps) {
  const [names, setNames] = useState<StratNameI[]>([]);

  const onQueryChange = (i: string) => {
    getStratNames(i, (e: StratNameI[]) => setNames(e), props.col_id);
  };

  useEffect(() => {
    onQueryChange("");
  }, []);

  return h(StrtaNameQueryList, {
    itemRenderer: StratNameItemRenderer,
    itemPredicate,
    onItemSelect: props.onItemSelect,
    items: names,
    renderer: StratNameQueryListRenderer,
    resetOnSelect: true,
    menuProps: { style: { maxWidth: "100%", margin: "0 10px" } },
    onQueryChange,
  });
}

export { StratNameSelect };
