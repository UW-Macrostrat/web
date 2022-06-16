import { useState, useEffect } from "react";
import pg from "../../db";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { StratNameI } from "../..";
import { MenuItem } from "@blueprintjs/core";
import { ItemRenderer } from "@blueprintjs/select";
import { ItemSuggest } from "../suggest";
import {
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from "@supabase/postgrest-js";

const h = hyperStyled(styles);

export interface StratNameDataI {
  value: string;
  data: StratNameI;
}

function StratNameTooltipContent(props: { data: StratNameI }) {
  const { data } = props;
  const { strat_names_meta, strat_name, rank, ...rest } = data;

  if (!strat_names_meta) {
    return h("div.no-strat-meta", [
      h("h4", [
        strat_name,
        " ",
        rank,
        " is not connected to an official source.",
      ]),
    ]);
  }
  const { name, geologic_age, url } = strat_names_meta;

  return h(
    "div.strat-name-tooltip",

    [
      //summarise concept
      h("h4.underline", ["Linked to official Lexicon"]),
      h("h4", [
        name,
        "-",
        h("i", ["view ", h("a", { href: url, target: "_blank" }, ["source"])]),
      ]),
      h("h4", [geologic_age]),
    ]
  );
}

const itemRenderer: ItemRenderer<StratNameDataI> = (
  item: StratNameDataI,
  { handleClick, modifiers, index }
) => {
  const { value, data } = item;

  return h(
    MenuItem,
    {
      key: index,
      intent: data.strat_names_meta ? "primary" : "warning",
      text: value,
      onClick: handleClick,
      active: modifiers.active,
    },
    [h(StratNameTooltipContent, { data })]
  );
};

const getStratNames = async (
  query: string,
  setNames: (e: StratNameDataI[]) => void,
  col_id?: number
) => {
  let baseQuery: PostgrestFilterBuilder<any> | PostgrestQueryBuilder<any> =
    pg.from("strat_names");
  if (typeof col_id !== "undefined") {
    baseQuery = pg.rpc("get_strat_names_col_priority", { _col_id: col_id });
  }
  if (query.length > 2) {
    const { data, error } = await baseQuery
      .select("*,strat_names_meta(*)")
      .like("strat_name", `%${query}%`)
      .limit(50);
    const d: StratNameDataI[] = data?.map((d: StratNameI) => {
      return { value: `${d.strat_name} ${d.rank}`, data: d };
    });
    setNames(d);
  } else {
    const { data, error } = await baseQuery
      .select("*,strat_names_meta(*)")
      .limit(50);
    const d: StratNameDataI[] = data?.map((d: StratNameI) => {
      return { value: `${d.strat_name} ${d.rank}`, data: d };
    });
    setNames(d);
  }
};

interface StratCellProps {
  initialSelected?: StratNameDataI | undefined;
  onChange: (item: StratNameDataI) => void;
  placeholder?: string;
  col_id?: number;
}

function StratNameSuggest(props: StratCellProps) {
  const [names, setNames] = useState<StratNameDataI[]>([]);

  const onQueryChange = (i: string) => {
    getStratNames(i, (e: StratNameDataI[]) => setNames(e), props.col_id);
  };

  useEffect(() => {
    onQueryChange("");
  }, []);
  console.log(props.initialSelected);
  return h(ItemSuggest, {
    items: names,
    onQueryChange: onQueryChange,
    onChange: props.onChange,
    initialSelected: props.initialSelected,
    itemRenderer,
    placeholder: props.placeholder,
  });
}

export { StratNameSuggest };
