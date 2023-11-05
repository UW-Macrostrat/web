import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

export function Page() {
  return h(ClientOnly, {
    component: () => import("@macrostrat-web/data-sheet-test"),
  });
}
