import LithologyHierarchy from "@macrostrat-web/lithology-hierarchy";
import { ContentPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import h from "./main.module.sass";
import { OverlaysProvider } from "@blueprintjs/core";

export function Page() {
  return h(ContentPage, [
    h("div.main", [
      h(StickyHeader, h(PageBreadcrumbs, { title: "Lithologies" })),
      h(LithologyHierarchy),
    ]),
  ]);
}
