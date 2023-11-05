import h from "@macrostrat/hyper";

export function Page() {
  return h("div.dev-page", [
    h("h1", "Macrostrat user interface tests"),
    h("ul", [h("li", h("a", { href: "/dev/tests/data-sheet" }, "Data sheet"))]),
  ]);
}
