import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { FullscreenPage } from "~/layouts";
import h from "@macrostrat/hyper";
import { PageBreadcrumbs } from "~/renderer";

export function Page() {
  return h(FullscreenPage, [h(PageBreadcrumbs), h(LithologyHierarchy)]);
}
