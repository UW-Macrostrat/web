import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";

const MapPage = () => import("./map")

export function Page() {

  return h(
    ClientOnly,
    {
      component: MapPage,
    },
    null
  )
}
