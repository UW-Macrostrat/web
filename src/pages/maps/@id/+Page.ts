import h from "@macrostrat/hyper";
import { ClientOnly } from "~/renderer/client-only";
const MapInterface = () => import("./map-interface");

export function Page({ map }) {
  return h("div.single-map", h(ClientOnly, { component: MapInterface, map }));
}
