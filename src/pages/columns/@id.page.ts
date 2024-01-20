import h from "@macrostrat/hyper";

import { ClientOnly } from "~/renderer/client-only";

const StratColumn = (props) => {
  return h(ClientOnly, {
    component: () => import("./strat-column").then((d) => d.StratColumn),
    ...props,
  });
};

export function Page({ columnInfo }) {
  const { col_id } = columnInfo;
  return h("div", [
    h("h1", "Column " + col_id),
    h(StratColumn, { columnInfo }),
  ]);
}
