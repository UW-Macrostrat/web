import h from "@macrostrat/hyper";

import { ClientOnly } from "~/renderer/client-only";

const StratColumn = (props) => {
  return h(ClientOnly, {
    component: () => import("./column-inspector"),
    ...props,
  });
};

export function Page({ columnInfo }) {
  return h(StratColumn, { columnInfo });
}
