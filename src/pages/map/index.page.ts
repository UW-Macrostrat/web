import h from "@macrostrat/hyper";
import { onDemand } from "~/_utils";

const MapPage = onDemand(() => import("./map"));

export function Page() {
  return h(MapPage, { routerBasename: "/map" });
}
