import { useState, useEffect } from "react";
import pg from "../../db";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { StratNameI } from "../..";
import { MySuggest } from "../suggest";

const h = hyperStyled(styles);

export interface StratNameDataI {
  value: string;
  data: StratNameI | Partial<StratNameI>;
}

const getStratNames = async (
  query: string,
  setNames: (e: StratNameDataI[]) => void
) => {
  if (query.length > 2) {
    const { data, error } = await pg
      .from("strat_names_ref")
      .select()
      .like("strat_name", `%${query}%`)
      .limit(50);
    const d: StratNameDataI[] = data?.map((d: StratNameI) => {
      return { value: d.strat_name, data: d };
    });
    setNames(d);
  } else {
    const { data, error } = await pg
      .from("strat_names_ref")
      .select()
      .limit(50);
    const d: StratNameDataI[] = data?.map((d: StratNameI) => {
      return { value: d.strat_name, data: d };
    });
    setNames(d);
  }
};

interface StratCellProps {
  initialSelected?: StratNameDataI | undefined;
  onChange: (item: StratNameDataI) => void;
}

function StratNameSuggest(props: StratCellProps) {
  const [names, setNames] = useState<StratNameDataI[]>([]);

  const onQueryChange = (i: string) => {
    getStratNames(i, (e: StratNameDataI[]) => setNames(e));
  };

  useEffect(() => {
    onQueryChange("");
  }, []);

  return h(MySuggest, {
    items: names,
    onQueryChange: onQueryChange,
    onChange: props.onChange,
    initialSelected: props.initialSelected,
  });
}

export { StratNameSuggest };
