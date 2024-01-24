import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";

export function Page() {
  return h(ContentPage, [
    h("h1", "Macrostrat development pages"),
    h("ul", [
      h("li", h("a", { href: "/dev/globe" }, "Globe")),
      h("li", h("a", { href: "/dev/paleo" }, "Paleogeography")),
      h("li", h("a", { href: "/dev/ui-tests" }, "UI tests")),
    ]),
  ]);
}
