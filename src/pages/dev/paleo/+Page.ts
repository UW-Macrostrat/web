import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const PaleoMap = () => import("./paleo-map");

export function Page() {
  return h(
    ClientOnly,
    {
      component: PaleoMap,
    },
    null
  );
}
