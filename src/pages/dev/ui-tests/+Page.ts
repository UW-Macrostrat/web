import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";

export function Page() {
  return h(ContentPage, [
    h("h1", "Macrostrat user interface tests"),
    h("ul", [
      h("li", h("a", { href: "/dev/ui-tests/data-sheet" }, "Data sheet")),
      h(
        "li",
        h("a", { href: "/dev/ui-tests/lithology" }, "Lithology hierarchy")
      ),
    ]),
  ]);
}
