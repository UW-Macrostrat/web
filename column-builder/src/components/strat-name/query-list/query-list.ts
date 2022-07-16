import { useState, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  QueryList,
  ItemRenderer,
  IQueryListRendererProps,
  ItemPredicate,
} from "@blueprintjs/select";
import pg from "~/db";
import { Button, Callout, InputGroup, MenuItem } from "@blueprintjs/core";
import styles from "./strat-name.module.scss";
import {
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from "@supabase/postgrest-js";
import { StratNameI, STRAT_SOURCE } from "~/types";

const h = hyperStyled(styles);

const StrtaNameQueryList = QueryList.ofType<StratNameI>();

const itemPredicate: ItemPredicate<StratNameI> = (query, item, index) => {
  const { strat_name } = item;

  return strat_name?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

const StratNameListItem = (props: StratNameI) => {
  const { strat_name, author, rank, parent, source } = props;

  let sourceText: string;
  if (source == STRAT_SOURCE.COLUMN) {
    sourceText = "current column";
  } else if (source == STRAT_SOURCE.NEARBY) {
    sourceText = "nearby column";
  } else {
    sourceText = "lexicon";
  }
  if (author) sourceText = sourceText + ` (${author})`;

  const parentText = parent ? `(${parent})` : "";

  return h("div.flex-between", [
    `${strat_name} ${rank} ${parentText}`,
    h("i", [sourceText]),
  ]);
};

const StratNameItemRenderer: ItemRenderer<StratNameI> = (
  item: StratNameI,
  { handleClick, index, modifiers }
) => {
  const { author } = item;

  return h(MenuItem, {
    key: index,
    intent: author ? "primary" : "warning",
    text: h(StratNameListItem, { ...item }),
    onClick: handleClick,
    active: modifiers.active,
  });
};

const StratNameNewRenderer = () => {
  return h(Callout, { intent: "warning", title: "No results" }, [
    `Don't see what you're looking for? Want to make a new strat_name?`,
    h(Button, { intent: "success" }, ["Create name"]),
  ]);
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
      .select()
      .ilike("strat_name", `%${query}%`)
      .limit(50);
    setNames(data ?? []);
  } else {
    const { data, error } = await baseQuery.select().limit(50);
    setNames(data ?? []);
  }
};

interface StratNameSelectProps {
  onItemSelect: (l: StratNameI) => void;
  col_id: number;
}

function StratNameSelect(props: StratNameSelectProps) {
  const [names, setNames] = useState<StratNameI[]>([]);
  console.log(names);
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
    noResults: h(StratNameNewRenderer),
    menuProps: {
      style: {
        maxWidth: "100%",
        margin: "0 10px",
        maxHeight: "400px !important",
      },
    },
    onQueryChange,
  });
}

export { StratNameSelect };
