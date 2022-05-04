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
