import h from "@macrostrat/hyper";
import { tileserverDomain } from "@macrostrat-web/settings";
import { VectorMapInspectorPage } from "./interface";

export function Page() {
  return h(VectorMapInspectorPage, {
    title: "Server-side filtering",
    tileset: tileserverDomain + "/v2/carto/{z}/{x}/{y}",
  });
}
