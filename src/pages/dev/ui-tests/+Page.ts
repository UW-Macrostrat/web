import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/renderer";

export function Page() {
  return h(ContentPage, [
    h(PageBreadcrumbs),
    h("h1", "Macrostrat user interface tests"),
    h("ul", [
      h("li", h("a", { href: "/dev/ui-tests/data-sheet" }, "Data sheet")),
    ]),
  ]);
}
