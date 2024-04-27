import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { ContentPage } from "~/layouts";
import h from "@macrostrat/hyper";

export function Page() {
  return h(ContentPage, [h(LithologyHierarchy)]);
}
