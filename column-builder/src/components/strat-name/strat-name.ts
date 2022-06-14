import { useState, useEffect } from "react";
import pg from "../../db";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { StratNameI } from "../..";
import { MenuItem } from "@blueprintjs/core";
import { ItemRenderer } from "@blueprintjs/select";
import { ItemSuggest } from "../suggest";

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
  setNames: (e: StratNameDataI[]) => void
) => {
  if (query.length > 2) {
    const { data, error } = await pg
      .from("strat_names")
      .select("*,strat_names_meta(*)")
      .like("strat_name", `%${query}%`)
      .limit(50);
    const d: StratNameDataI[] = data?.map((d: StratNameI) => {
      return { value: `${d.strat_name} ${d.rank}`, data: d };
    });
    setNames(d);
  } else {
    const { data, error } = await pg
      .from("strat_names")
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
}

function StratNameSuggest(props: StratCellProps) {
  const [names, setNames] = useState<StratNameDataI[]>([]);
  console.log(names);
  const onQueryChange = (i: string) => {
    getStratNames(i, (e: StratNameDataI[]) => setNames(e));
  };

  useEffect(() => {
    onQueryChange("");
  }, []);

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
