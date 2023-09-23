import h from "@macrostrat/hyper";
import { onDemand } from "~/_utils";

const GlobeDevPage = onDemand(() => import("~/map-interface/globe"));

export function Page() {
  return h("div.globe", h(GlobeDevPage));
}
