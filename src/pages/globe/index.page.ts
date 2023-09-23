import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

export function Page() {
  return h(
    "div.globe",
    h(ClientOnly, { component: () => import("~/map-interface/globe") })
  );
}
