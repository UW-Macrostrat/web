import { useState, useEffect } from "react";
import { fetchStratNames } from "./fetch";
import { Spinner } from "@blueprintjs/core";
//import { Hierarchy } from "@macrostrat/ui-components/lib/esm";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "./hierarchy.module.scss";

const h = hyperStyled(styles);

export interface IHierarchy {
  name: string;
  units?: number;
  kinder?: IHierarchy[];
  active?: boolean;
  onClick?: (e) => void;
}

function Hierarchy(props: IHierarchy) {
  const {
    kinder = [],
    units = 0,
    name,
    active = false,
    onClick = (e) => {},
  } = props;

  const className = active ? ".active" : "";

  return h(`div.hierarchy-container  ${className}`, { onClick }, [
    h("div.hierarchy-name", [name, h("span.badge", [units])]),
    h.if(kinder.length > 0)("div.hierarchy-children", [
      kinder.map((c, i) => {
        return h(Hierarchy, { ...c, key: i });
      }),
    ]),
  ]);
}

export { Hierarchy };

export function StratNameHierarchy({
  strat_name_id,
}: {
  strat_name_id: number;
}) {
  const [state, setState] = useState<Partial<IHierarchy>>({});
  console.log(strat_name_id);

  useEffect(() => {
    async function fetch() {
      const res = await fetchStratNames(strat_name_id);
      setState(res);
    }
    fetch();
  }, [strat_name_id]);
  if (!state) {
    return h("h3", "No results");
  }
  if (!state.name) {
    return h(Spinner);
  }

  return h("div", { style: { flexGrow: 1, marginLeft: "50px" } }, [
    h(Hierarchy, { ...state }),
  ]);
}
