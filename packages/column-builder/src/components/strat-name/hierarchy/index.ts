import { useState, useEffect } from "react";
import { fetchStratNames } from "./fetch";
import { Spinner } from "@blueprintjs/core";
import { Hierarchy, IHierarchy } from "@macrostrat/data-components";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "./hierarchy.module.scss";

const h = hyperStyled(styles);

export { Hierarchy };

export function StratNameHierarchy({
  strat_name_id,
}: {
  strat_name_id?: number;
}) {
  const [state, setState] = useState<Partial<IHierarchy>>({});

  useEffect(() => {
    async function fetch() {
      const res = await fetchStratNames(strat_name_id);
      setState(res);
    }
    if (typeof strat_name_id !== "undefined") {
      fetch();
    }
  }, [strat_name_id]);

  if (typeof strat_name_id === "undefined") return null;
  
  if (!state) {
    return h("h3", "No results");
  }

  return h("div.strat-name-hierarchy", [
    h.if(state.name)(Hierarchy, { ...state }),
    h.if(!state.name)(Spinner),
  ]);
}
