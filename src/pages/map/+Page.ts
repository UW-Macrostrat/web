import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const MapPage = () => import("./map-interface");

export function Page() {
  return h(
    ClientOnly,
    {
      component: MapPage,
    },
    null
  );
}
