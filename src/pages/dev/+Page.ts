import h from "@macrostrat/hyper";

export function Page() {
  return h("div.dev-page", [
    h("h1", "Macrostrat development pages"),
    h("ul", [
      h("li", h("a", { href: "/dev/globe" }, "Globe")),
      h("li", h("a", { href: "/dev/paleo" }, "Paleogeography")),
      h("li", h("a", { href: "/dev/ui-tests" }, "UI tests")),
    ]),
  ]);
}
