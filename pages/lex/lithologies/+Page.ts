import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import h from "./main.module.sass";
import { OverlaysProvider } from "@blueprintjs/core";

export function Page() {
  return h("div.main", [
    h(PageBreadcrumbs, { title: "Lithologies" }),
    h(OverlaysProvider, h(LithologyHierarchy, { expandOnHover: true })),
  ]);
}
